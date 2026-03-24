import { NextResponse } from "next/server";

const GH_TOKEN = process.env.GITHUB_TOKEN || "";
const REPO = "juboyy/paganini-aios";

export async function GET() {
  try {
    // Fetch last 90 days of commits from GitHub
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };
    if (GH_TOKEN) headers.Authorization = `token ${GH_TOKEN}`;

    const dates: Record<string, number> = {};
    
    // Fetch up to 3 pages (300 commits)
    for (let page = 1; page <= 3; page++) {
      const url = `https://api.github.com/repos/${REPO}/commits?per_page=100&page=${page}&since=${since}`;
      const res = await fetch(url, { headers, next: { revalidate: 3600 } });
      
      if (!res.ok) break;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;
      
      for (const c of data) {
        const d = c?.commit?.author?.date?.slice(0, 10);
        if (d) dates[d] = (dates[d] || 0) + 1;
      }
    }

    // Fill gaps (days with 0 commits)
    const result: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().slice(0, 10);
      result.push({ date: dateStr, count: dates[dateStr] || 0 });
    }

    const totalCommits = Object.values(dates).reduce((s, v) => s + v, 0);
    const activeDays = Object.keys(dates).length;
    const maxDay = Math.max(...Object.values(dates), 0);

    return NextResponse.json({
      heatmap: result,
      stats: { totalCommits, activeDays, maxDay, repo: REPO },
    });
  } catch {
    return NextResponse.json({ heatmap: [], stats: { totalCommits: 0, activeDays: 0, maxDay: 0, repo: REPO } });
  }
}
