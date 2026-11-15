const siteUrl =
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL ||
  process.env.NEXTAUTH_URL;

export async function invokeCron(path: string): Promise<{ statusCode: number; body: string }> {
  if (!siteUrl) {
    throw new Error('Netlify site URL is not configured');
  }

  const headers: HeadersInit = {};
  if (process.env.CRON_SECRET) {
    headers['x-cron-secret'] = process.env.CRON_SECRET;
  }

  const response = await fetch(`${siteUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Cron endpoint failed with status ${response.status}`);
  }

  return {
    statusCode: response.status,
    body: await response.text(),
  };
}
