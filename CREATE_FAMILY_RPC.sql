
-- 0. CLEANUP: Drop existing functions to avoid return type conflicts
drop function if exists public.add_family_member(text);
drop function if exists public.respond_to_family_request(uuid, boolean);
drop function if exists public.remove_family_member(uuid);
drop function if exists public.send_family_request_rpc(text);

-- 1. add_family_member (Owner adds Member)
-- Logic: Check if Caller is in a family. Update Target's family_id to match Caller.
create or replace function public.add_family_member(target_email text)
returns json
language plpgsql
security definer
as $$
declare
  target_user_id uuid;
  my_family_id text;
begin
  -- Get Target ID
  select id into target_user_id from profiles where email = target_email;
  if target_user_id is null then raise exception 'Usuario no encontrado'; end if;
  
  -- Prevent Self-Invite
  if target_user_id = auth.uid() then raise exception 'No puedes agregarte a ti mismo'; end if;

  -- Get My Family ID
  select family_id into my_family_id from profiles where id = auth.uid();
  if my_family_id is null then 
     my_family_id := 'family_' || auth.uid(); -- Generate new if none
     update profiles set family_id = my_family_id where id = auth.uid();
  end if;
  
  -- Check if Target is already in a DIFFERENT family
  declare
    target_family_id text;
  begin
    select family_id into target_family_id from profiles where id = target_user_id;
    if target_family_id is not null and target_family_id != my_family_id then
       -- INSTEAD OF ERROR, RETURN SPECIAL CODE TO PROMPT FRONTEND
       -- The frontend will then call send_family_request_rpc
       raise exception 'Este usuario ya pertenece a otro grupo familiar';
    end if;
    
    if target_family_id = my_family_id then
       raise exception 'Este usuario ya está en tu grupo familiar';
    end if;
  end;

  -- Update Target
  update profiles set family_id = my_family_id where id = target_user_id;
  
  return json_build_object('success', true);
end;
$$;

-- 2. respond_to_family_request (Target accepts Request from Requester)
-- Logic: Check Notification. Update Requester's family_id to match Target (Approver).
create or replace function public.respond_to_family_request(notification_id uuid, accept boolean)
returns json
language plpgsql
security definer
as $$
declare
  notif record;
  approver_family_id text;
  requester_family_id text;
  payload_family_id text;
begin
  -- Get Notification and Verify Ownership
  select * into notif from notifications where id = notification_id;
  
  if notif.to_user_id != auth.uid() then
    raise exception 'No autorizado';
  end if;
  
  if accept then
    -- Check payload to determine direction
    -- If payload has family_id, it means the SENDER (Requester) wants ME (Target) to join THEIR family
    -- OR Sender wants to join MY family.
    
    -- In send_family_request_rpc, we set payload family_id = SENDER'S FAMILY ID.
    -- So the invitation is "Come join my family (payload_family_id)".
    
    if notif.payload is not null and notif.payload->>'family_id' is not null then
       payload_family_id := notif.payload->>'family_id';
       
       -- I (Target/Auth) am accepting to join payload_family_id
       update profiles set family_id = payload_family_id where id = auth.uid();
       
    else
       -- FALLBACK / LEGACY LOGIC: Requester wants to join MY family
       -- Get My Family ID (Approver)
       select family_id into approver_family_id from profiles where id = auth.uid();
    
       if approver_family_id is null then
          raise exception 'No tienes un grupo familiar';
       end if;
    
       -- Update Requester (from_user_id) to join Approver's family
       update profiles set family_id = approver_family_id where id = notif.from_user_id;
    end if;
    
    update notifications set status = 'accepted' where id = notification_id;
  else
    update notifications set status = 'rejected' where id = notification_id;
  end if;
  
  return json_build_object('success', true);
end;
$$;

-- 3. remove_family_member (Owner/Admin removes Member)
create or replace function public.remove_family_member(target_user_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  my_family_id text;
  target_family_id text;
begin
  -- Get My Family ID
  select family_id into my_family_id from profiles where id = auth.uid();
  if my_family_id is null then raise exception 'No perteneces a ningún grupo familiar'; end if;

  -- Get Target Family ID
  select family_id into target_family_id from profiles where id = target_user_id;
  
  if target_family_id != my_family_id then
     raise exception 'Este usuario no pertenece a tu grupo familiar';
  end if;

  -- Remove from family (set null)
  update profiles set family_id = null where id = target_user_id;
  
  -- Also remove from allowed_editors if present (Optional cleanup)
  -- This requires array manipulation logic, omitting for simplicity or handling in frontend
  
  return json_build_object('success', true);
end;
$$;

-- 4. send_family_request_rpc (Sender requests to join Receiver's family)
-- Used when "User already belongs to another family"
create or replace function public.send_family_request_rpc(target_email text)
returns json
language plpgsql
security definer
as $$
declare
  target_user_id uuid;
  target_family_id text;
  my_family_id text;
  existing_request uuid;
begin
   -- Get Target
   select id, family_id into target_user_id, target_family_id from profiles where email = target_email;
   
   if target_user_id is null then raise exception 'Usuario no encontrado'; end if;
   if target_user_id = auth.uid() then raise exception 'No puedes enviarte una solicitud a ti mismo'; end if;
   
   -- Get My Family ID (Sender's family)
   select family_id into my_family_id from profiles where id = auth.uid();
   if my_family_id is null then 
     my_family_id := 'family_' || auth.uid();
     update profiles set family_id = my_family_id where id = auth.uid();
   end if;

   -- CASE A: Target has a family (Original logic: I want to join THEM)
   -- BUT wait, the user asked: "A wants to invite B again". 
   -- If B is alone (has their own family_id), A wants B to join A's family.
   -- So this is an INVITATION, not a request to join.
   
   -- Let's support both directions or clarify the intent.
   -- Current UI context: "Este usuario ya pertenece a otro grupo familiar, deseas que le enviemos una solicitud para que te una a su grupo familiar?"
   -- This text suggests A wants to join B.
   -- BUT if A invites B, usually A wants B to join A.
   
   -- Let's assume this RPC is for "Inviting someone who has a family to join MY family"
   -- OR "Requesting to join THEIR family".
   
   -- To solve the user scenario: "A invites B again".
   -- B has a family_id (the old one). A has a family_id (the new one).
   -- A wants B to join A.
   -- So we should send a notification to B saying "A wants you to join their family".
   
   -- Check existing pending request
   select id into existing_request from notifications 
   where type = 'family_request' 
   and from_user_id = auth.uid() 
   and to_user_id = target_user_id 
   and status = 'pending';
   
   if existing_request is not null then
      raise exception 'Ya has enviado una solicitud a este usuario';
   end if;

   -- Create Notification for Target (B) from Me (A)
   -- Type: 'family_invite' (New type? Or reuse family_request?)
   -- Reuse 'family_request' but payload differs?
   -- Let's stick to 'family_request' but imply "Join Me"
   
   insert into notifications (type, from_user_id, to_user_id, payload)
   values ('family_request', auth.uid(), target_user_id, json_build_object('family_id', my_family_id));

   return json_build_object('success', true, 'message', 'Solicitud enviada correctamente');
end;
$$;
