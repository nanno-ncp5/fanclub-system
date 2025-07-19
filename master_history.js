// 認証状態の確定を待ってから、ページの処理を開始する
auth.onAuthStateChanged((user) => {
    if (user) {
        initializeMasterHistoryPage();
    } else {
        window.location.href = 'index.html';
    }
});

function initializeMasterHistoryPage() {
    const historyTableBody = document.getElementById('history-table-body');
    const csvExportButton = document.getElementById('csv-export-button');
    const resetMasterButton = document.getElementById('reset-master-button'); // ★追加

    const masterCollectionRef = db.collection("master_distributions");
    
    // ▼▼▼ マスターリセット用のパスワード（必ず変更してください！）▼▼▼
    const MASTER_RESET_PASSWORD = "master_password_456";
    
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
        link.style.visibility = 'hidden'; document.body.appendChild(link);
        link.click(); document.body.removeChild(link);
    });

    // --- ★★★ここから追加★★★ ---
    // --- ツアー全履歴リセット機能 ---
    resetMasterButton.addEventListener('click', async () => {
        const inputPassword = prompt("【警告】ツアー全体の全履歴が削除されます。マスターパスワードを入力してください：");

        if (inputPassword === null) return; // キャンセルされた場合

        if (inputPassword !== MASTER_RESET_PASSWORD) {
            alert("マスターパスワードが違います。");
            return;
        }

        if (confirm("本当によろしいですか？\n\nこれにより【ツアー全体の配布履歴】がすべて削除されます。\nこの操作は絶対に元に戻せません。")) {
            try {
                const querySnapshot = await masterCollectionRef.get();
                const batch = db.batch();
                querySnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                alert("ツアー全体の全履歴をリセットしました。");
            } catch (error) {
                console.error("Error resetting master history: ", error);
                alert("リセット中にエラーが発生しました。");
            }
        }
    });
    // --- ★★★ここまで追加★★★ ---
}
