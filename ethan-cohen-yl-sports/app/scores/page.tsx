import Header from "@/components/Header";
import Link from "next/link";
import { adminSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Scores() {
  const { data: scoreRows } = await adminSupabase()
    .from("galleries")
    .select("*")
    .eq("is_public", true)
    .not("home_score", "is", null)
    .order("game_date", { ascending: false });

  const scores = scoreRows ?? [];

  return (
    <>
      <Header />

      <main className="page">
        <p className="eyebrow">YESHIVA LEAGUE RESULTS</p>
        <h1 className="title">SCORES.</h1>

        <div>
          {scores.map((game: any) => (
            <Link
              className="score"
              href={`/gallery/${game.slug}`}
              key={game.id}
            >
              <span>
                <b>{game.sport}</b>
                <br />
                {game.game_date || ""}
                <br />
                {game.team_home} vs. {game.team_away}
              </span>

              <strong>
                {game.home_score} — {game.away_score}
              </strong>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
