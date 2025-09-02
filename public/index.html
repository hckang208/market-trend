<script>
  async function fetchAnalysis(name, price, news) {
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price, news }),
      });
      if (!res.ok) throw new Error("분석 API 실패");
      return await res.json();
    } catch (err) {
      console.error("AI 분석 오류:", err);
      return { summary: "분석 불가" };
    }
  }

  async function loadRetailers() {
    const container = document.getElementById("retailers");
    container.innerHTML = "";

    for (const r of retailers) {
      const [data, newsData] = await Promise.all([
        fetchStock(r.code),
        fetchNews(r.name)
      ]);

      const col = document.createElement("div");
      col.className = "col-md-6";

      if (data.error) {
        col.innerHTML = `
          <div class="card p-3 mb-3">
            <h6>${r.name} (${r.code})</h6>
            <p class="text-danger">데이터 불러오기 실패</p>
          </div>`;
      } else {
        let newsHtml = "";
        if (newsData.articles && newsData.articles.length > 0) {
          newsHtml = `
            <ul class="mt-2">
              ${newsData.articles.map(a => 
                `<li><a href="${a.url}" target="_blank">${a.title}</a> <small class="text-muted">(${a.source})</small></li>`
              ).join("")}
            </ul>`;
        } else {
          newsHtml = `<p class="text-muted">관련 뉴스 없음</p>`;
        }

        const cardId = `card-${r.code}`;

        col.innerHTML = `
          <div class="card p-3 mb-3" id="${cardId}">
            <h6>${data.longName || r.name} (${data.symbol})</h6>
            <p class="fw-bold">${data.price} ${data.currency}</p>
            <p class="text-muted">전일종가: ${data.previousClose || "-"} | 시가: ${data.open || "-"}</p>
            <p class="text-muted">고가/저가: ${data.dayHigh || "-"} / ${data.dayLow || "-"}</p>
            <p class="text-muted">시가총액: ${data.marketCap || "-"}</p>
            <div class="mt-2"><strong>관련 뉴스</strong>${newsHtml}</div>
            <button class="btn btn-sm btn-outline-primary mt-2" onclick="analyzeRetailer('${cardId}', '${r.name}', '${data.price}', ${JSON.stringify(newsData.articles)})">AI 분석보기</button>
            <div class="analysis mt-2 text-muted small"></div>
          </div>`;
      }

      container.appendChild(col);
    }
  }

  async function analyzeRetailer(cardId, name, price, news) {
    const card = document.getElementById(cardId);
    const analysisDiv = card.querySelector(".analysis");
    analysisDiv.innerText = "분석 중...";

    const result = await fetchAnalysis(name, price, news);
    analysisDiv.innerText = result.summary;
  }

  loadRetailers();
</script>
