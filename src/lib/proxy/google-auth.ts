import { JWT } from "google-auth-library";

export async function getGoogleAccessToken(
  credentialsBase64: string,
  scopes: string[],
): Promise<string> {
  const credentials = JSON.parse(
    Buffer.from(credentialsBase64, "base64").toString(),
  );

  const client = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes,
  });

  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Google auth returned no access token");
  return token;
}
