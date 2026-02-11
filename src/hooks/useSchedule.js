import { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';

export const useSchedule = (selectedDay, currentDate, refreshKey, userId) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await dataService.getSchedule(selectedDay, currentDate, userId);
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDay, currentDate, refreshKey, userId]);

  return { data, isLoading, error };
};
