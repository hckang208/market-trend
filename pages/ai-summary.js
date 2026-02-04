import React, { useEffect, useMemo, useState } from "react";
import styles from "../styles/ai-summary.module.css";

export default function AISummaryPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");
  const [foreign, setForeign] = useState(null);
  const [korea, setKorea] = useState(null);

  const [generatedAtLocal, setGeneratedAtLocal] = useState("—");

  const loadSummaries = async () => {
    try {
      setLoading(true);
      setErr("");
      const [rf, rk] = await Promise.all([
        fetch("/api/ai-news-foreign"),
        fetch("/api/ai-news-korea"),
      ]);
      const jf = await rf.json();
      const jk = await rk.json();
      if (!rf.ok) throw new Error(jf?.error || "해외뉴스 요약 실패");
      if (!rk.ok) throw new Error(jk?.error || "국내뉴스 요약 실패");
      setForeign(jf);
      setKorea(jk);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setGeneratedAtLocal(
      new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
    );
    loadSummaries();
  }, []);

  const updatedAt = useMemo(() => {
    const dates = [foreign?.generatedAt, korea?.generatedAt]
      .filter(Boolean)
      .map((value) => new Date(value));
    if (!dates.length) return "—";
    const latest = new Date(Math.max(...dates.map((date) => date.getTime())));
    return latest.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  }, [foreign, korea]);

  const hasFallback = Boolean(foreign?.fallback || korea?.fallback);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <a href="/" className={styles.backLink}>
            &larr; 돌아가기
          </a>
          <span className={styles.pill}>AI Market Intelligence</span>
        </div>
        <h1 className={styles.title}>Market Intelligence Brief</h1>
        <p className={styles.subtitle}>
          해외·국내 패션/의류 산업 뉴스를 기반으로 최신 트렌드와 실행 가능한 인사이트를
          제공합니다.
        </p>
        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>분석 시각</span>
            <span className={styles.metaValue}>{updatedAt}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>클라이언트 시간</span>
            <span className={styles.metaValue}>{generatedAtLocal}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>모델</span>
            <span className={styles.metaValue}>GEMINI 2.5</span>
          </div>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => {
              setRefreshing(true);
              loadSummaries();
            }}
            disabled={loading || refreshing}
          >
            {refreshing ? "업데이트 중..." : "지금 업데이트"}
          </button>
        </div>
      </header>

      {err && (
        <div className={styles.alert}>
          <strong>에러:</strong> {err}
        </div>
      )}

      {hasFallback && (
        <div className={styles.notice}>
          일부 항목은 AI 응답이 지연되어 로컬 요약으로 대체되었습니다.
        </div>
      )}

      <div className={styles.layout}>
        <main className={styles.main}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.cardOverline}>GLOBAL</p>
                <h2 className={styles.cardTitle}>해외 시장 요약</h2>
              </div>
              <span className={styles.cardBadge}>Just-Style · BOF</span>
            </div>
            <div className={styles.summary}>
              {foreign?.summary || (loading ? "요약 중…" : "—")}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.cardOverline}>KOREA</p>
                <h2 className={styles.cardTitle}>국내 시장 요약</h2>
              </div>
              <span className={styles.cardBadge}>한국섬유신문</span>
            </div>
            <div className={styles.summary}>
              {korea?.summary || (loading ? "요약 중…" : "—")}
            </div>
          </section>
        </main>

        <aside className={styles.aside}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitleSmall}>참고한 해외뉴스</h3>
              <span className={styles.cardBadgeLight}>Top 10</span>
            </div>
            <ul className={styles.list}>
              {(foreign?.items || []).map((n, i) => (
                <li key={i}>
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.listLink}
                  >
                    {n.title}
                  </a>
                  <div className={styles.listMeta}>
                    {n.source} {n.date || ""}
                  </div>
                </li>
              ))}
              {!loading && (foreign?.items || []).length === 0 && (
                <li className={styles.empty}>해외 뉴스가 없습니다.</li>
              )}
            </ul>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitleSmall}>참고한 국내뉴스</h3>
              <span className={styles.cardBadgeLight}>Top 10</span>
            </div>
            <ul className={styles.list}>
              {(korea?.items || []).map((n, i) => (
                <li key={i}>
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.listLink}
                  >
                    {n.title}
                  </a>
                  <div className={styles.listMeta}>
                    {n.source} {n.date || ""}
                  </div>
                </li>
              ))}
              {!loading && (korea?.items || []).length === 0 && (
                <li className={styles.empty}>국내 뉴스가 없습니다.</li>
              )}
            </ul>
          </section>
        </aside>
      </div>

      <footer className={styles.footerNote}>
        출처: 해외(Just-Style, Business of Fashion), 국내(한국섬유신문)
      </footer>
    </div>
  );
}
