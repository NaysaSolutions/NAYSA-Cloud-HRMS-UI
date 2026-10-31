
const unpack = (response) => {
  const raw =
    response?.data?.data?.[0]?.result ??
    response?.data?.data ??
    response?.data;

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  return raw ?? [];
};

export const parseLeaveReferences = (response) => {
  const data = unpack(response);

  return {
    ...data,
    leaves: data.leaves || data.leaveCodes || [],
  };
};

export const parseLeaveSelectionResult = (response) => {
  const data = unpack(response);

  return Array.isArray(data) ? data : (data.employees || []);
};
