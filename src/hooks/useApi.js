"use client";
import { useState, useCallback, useRef, useEffect } from "react";

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const call = useCallback(async (apiFunction, ...args) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction(...args);
      abortControllerRef.current = null;
      return result;
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err);
        throw err;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    call,
    clearError,
  };
};

export const usePaginatedApi = (
  apiFunction,
  initialPage = 1,
  initialLimit = 10
) => {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: initialPage,
    per_page: initialLimit,
    total: 0,
    last_page: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(
    async (page = 1, limit = initialLimit, filters = {}) => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFunction({
          page,
          per_page: limit,
          ...filters,
        });

        if (response.success) {
          setData(response.data.data || response.data);
          setPagination(
            response.data.pagination || {
              current_page: page,
              per_page: limit,
              total: response.data.length || 0,
              last_page: Math.ceil((response.data.length || 0) / limit),
            }
          );
        }
      } catch (err) {
        setError(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [apiFunction, initialLimit]
  );

  const refresh = useCallback(() => {
    fetchData(pagination.current_page, pagination.per_page);
  }, [fetchData, pagination.current_page, pagination.per_page]);

  const goToPage = useCallback(
    (page) => {
      fetchData(page, pagination.per_page);
    },
    [fetchData, pagination.per_page]
  );

  const changeLimit = useCallback(
    (limit) => {
      fetchData(1, limit);
    },
    [fetchData]
  );

  return {
    data,
    pagination,
    loading,
    error,
    fetchData,
    refresh,
    goToPage,
    changeLimit,
  };
};

export const useFormApi = (submitFunction) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const submit = useCallback(
    async (formData) => {
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const result = await submitFunction(formData);
        setSuccess(true);
        return result;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [submitFunction]
  );

  const clearState = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return {
    loading,
    error,
    success,
    submit,
    clearState,
  };
};

export default useApi;
