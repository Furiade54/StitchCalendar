import { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';

export const useCalendar = (currentDate, userId) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDays = async () => {
      setIsLoading(true);
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const result = await dataService.getCalendarDays(year, month, userId);
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDays();
  }, [currentDate, userId]);

  return { data, isLoading, error };
};
