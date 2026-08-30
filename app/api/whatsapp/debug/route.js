import crypto from 'crypto';

// Temporary diagnostic route — confirms Vercel's stored env values match what
// we expect, without ever exposing the real secret. Delete after use.
function sha256(s) {
  return crypto.createHash('sha256').update(s || '').digest('hex');
}

export async function GET() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || '';
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || '';
  return Response.json({
    token: { length: token.length, sha256: sha256(token) },
    phoneId: { value: phoneId, length: phoneId.length },
    verifyToken: { length: verifyToken.length, sha256: sha256(verifyToken) },
  });
}
