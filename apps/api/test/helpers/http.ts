export const postJson = async <T>(
  baseUrl: string,
  path: string,
  body: unknown,
  init?: {
    headers?: Record<string, string>;
  },
): Promise<{ data: T; response: Response }> => {
  const response = await fetch(`${baseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    method: 'POST',
  });
  const data = (await response.json()) as T;
  return { data, response };
};

export const patchJson = async <T>(
  baseUrl: string,
  path: string,
  body: unknown,
  init?: {
    headers?: Record<string, string>;
  },
): Promise<{ data: T; response: Response }> => {
  const response = await fetch(`${baseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    method: 'PATCH',
  });
  const data = (await response.json()) as T;
  return { data, response };
};
