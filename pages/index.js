// pages/index.js
import React from "react";
import Head from "next/head";
import ProcurementTopBlock from "../components/ProcurementTopBlock";
import IndicatorsSection from "../components/IndicatorsSection";
import StocksSection from "../components/StocksSection";
import NewsTabsSection from "../components/NewsTabsSection";
import NewsAISummarySection from "../components/NewsAISummarySection";

export default function Home() {
  return (
    <>
      <Head>
        <title>Hansol Market Intelligence | Executive Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+KR:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-mark">H</div>
            <div>
              <div className="logo-text">Hansol Market Intelligence</div>
              <div className="logo-subtitle">Executive Dashboard</div>
            </div>
          </div>
          <div className="live-status">
            <span className="pulse"></span>
            <span className="live-label">Live Data</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="main-container">
        <section className="section">
          <ProcurementTopBlock />
        </section>

        <section className="section">
          <IndicatorsSection />
        </section>

        <section className="section">
          <StocksSection />
        </section>

        <section className="section">
          <NewsTabsSection />
        </section>

        <section className="section">
          <NewsAISummarySection />
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p className="footer-text">© Hansol Textile — Market Intelligence Dashboard</p>
      </footer>
    </>
  );
}
