import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { createAdminClient } from '../../../lib/supabase/admin';
import ReplyBox from './ReplyBox';

/**
 * Public page for one founder video pitch: /v/<slug>. The email links here instead of attaching
 * a large file. Opening it is recorded on the row, so /admin/pitches shows who watched.
 * Link previews and bots (Slack, LinkedIn, Gmail's image proxy, crawlers) are not counted.
 */
export const dynamic = 'force-dynamic';

const BOT = /bot|crawl|spider|preview|slack|facebookexternalhit|linkedinbot|whatsapp|telegram|discord|googleimageproxy|ggpht|skypeuripreview|embedly|quora|pinterest|vkshare|w3c_validator|curl|wget|python|headless/i;

export async function generateMetadata({ params }) {
  const admin = createAdminClient();
  const { data } = await admin.from('video_pitches').select('company, poster_url').eq('slug', params.slug).maybeSingle();
  if (!data) return { title: 'Video' };
  return {
    title: `A short video for ${data.company}`,
    robots: { index: false, follow: false },
    openGraph: data.poster_url ? { images: [data.poster_url] } : undefined,
  };
}

export default async function PitchVideo({ params }) {
  const admin = createAdminClient();
  const { data: p } = await admin.from('video_pitches').select('id, company, website, video_url, poster_url, contact_name, status, views, first_viewed_at').eq('slug', params.slug).maybeSingle();
  if (!p || !p.video_url) notFound();

  const ua = headers().get('user-agent') || '';
  if (!BOT.test(ua)) {
    const now = new Date().toISOString();
    await admin.from('video_pitches').update({
      views: (p.views || 0) + 1,
      first_viewed_at: p.first_viewed_at || now,
      last_viewed_at: now,
      ...(p.status === 'sent' ? { status: 'viewed' } : {}),
      updated_at: now,
    }).eq('id', p.id);
  }

  const first = (p.contact_name || '').split(' ')[0];
  return (
    <main style={{ minHeight: '100vh', background: '#111', color: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', opacity: .6, marginBottom: 8 }}>Made for {p.company}</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 18px', textAlign: 'center', maxWidth: 520 }}>
        {first ? `${first}, ` : ''}here is a short explainer of {p.company}, built from your own website.
      </h1>
      <video src={p.video_url} poster={p.poster_url || undefined} controls playsInline preload="metadata"
        style={{ width: '100%', maxWidth: 380, aspectRatio: '9 / 16', borderRadius: 18, background: '#000', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }} />
      <p style={{ maxWidth: 440, textAlign: 'center', fontSize: 15, lineHeight: 1.55, opacity: .85, margin: '22px 0 14px' }}>
        I make product explainers, onboarding walkthroughs and short social videos like this for tech companies. If you want more like it, reply to my email or write to me here.
      </p>
      <ReplyBox slug={params.slug} company={p.company} />
      <a href="/" style={{ marginTop: 14, fontSize: 13, color: '#f5f5f5', opacity: .6 }}>Anas Qureshi</a>
    </main>
  );
}
