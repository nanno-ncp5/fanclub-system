// 認証状態の確定を待ってから、ページの処理を開始する
auth.onAuthStateChanged((user) => {
    if (user) {
        // ログインが確認できたら、ページの初期化処理を呼び出す
        initializeMasterHistoryPage();
    } else {
        // 未ログインなら、ログインページに強制的に戻す
        window.location.href = 'index.html';
    }
});

function initializeMasterHistoryPage() {
    const historyTableBody = document.getElementById('history-table-body');
    const csvExportButton = document.getElementById('csv-export-button');

    // ▼▼▼ ツアー全体の配布済み名簿を参照 ▼▼▼
    const masterCollectionRef = db.collection("master_distributions");
    
    let allHistoryData = [];

    // --- 履歴をリアルタイムで表示 ---
    masterCollectionRef.orderBy('distributedAt', 'desc')
      .onSnapshot(snapshot => {
        historyTableBody.innerHTML = '';
        allHistoryData = [];

        if (snapshot.empty) {
            historyTableBody.innerHTML = `<tr><td colspan="4">まだ配布履歴がありません。</td></tr>`;
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            allHistoryData.push(data);
            const tr = document.createElement('tr');
            const distributedDate = data.distributedAt.toDate().toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            // ▼▼▼ イベント名も表示 ▼▼▼
            tr.innerHTML = `
                <td>${distributedDate}</td>
                <td>${data.memberId}</td>
                <td>${data.staffName}</td>
                <td>${data.eventName || '不明'}</td>
            `;
            historyTableBody.appendChild(tr);
        });
      }, error => {
        console.error("Error fetching history: ", error);
        historyTableBody.innerHTML = '<tr><td colspan="4">履歴の読み込みに失敗しました。</td></tr>';
      });

    // --- CSV出力機能 ---
    function convertToCSV(data) {
        // ▼▼▼ CSVのヘッダーに「配布イベント」を追加 ▼▼▼
        const headers = "配布日時,会員番号,担当スタッフ,配布イベント";
        const rows = data.map(row => {
            const date = row.distributedAt.toDate().toLocaleString('ja-JP');
            return `"${date}","${row.memberId}","${row.staffName}","${row.eventName || '不明'}"`;
        });
        return `${headers}\n${rows.join('\n')}`;
    }

    csvExportButton.addEventListener('click', () => {
        if (allHistoryData.length === 0) {
            alert('出力するデータがありません。');
            return;
        }

        const csvData = convertToCSV(allHistoryData);
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        const now = new Date();
        const fileName = `master_distribution_history_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.csv`;
        link.setAttribute('download', fileName);
        
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}
