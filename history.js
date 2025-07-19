const historyTableBody = document.getElementById('history-table-body');
const deleteMemberIdInput = document.getElementById('delete-member-id-input');
const deleteButton = document.getElementById('delete-button');
const csvExportButton = document.getElementById('csv-export-button');
const collectionName = "distributions";

let allHistoryData = []; // CSV出力用に全データを保持

// --- 履歴をリアルタイムで表示 ---
db.collection(collectionName).orderBy('distributedAt', 'desc')
  .onSnapshot(snapshot => {
    historyTableBody.innerHTML = ''; // 一旦クリア
    allHistoryData = []; // データもクリア

    if (snapshot.empty) {
        historyTableBody.innerHTML = '<tr><td colspan="3">まだ配布履歴がありません。</td></tr>';
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        allHistoryData.push(data); // CSV用に保存

        const tr = document.createElement('tr');
        const distributedDate = data.distributedAt.toDate().toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

        tr.innerHTML = `
            <td>${distributedDate}</td>
            <td>${data.memberId}</td>
            <td>${data.staffName}</td>
        `;
        historyTableBody.appendChild(tr);
    });
  }, error => {
    console.error("Error fetching history: ", error);
    historyTableBody.innerHTML = '<tr><td colspan="3">履歴の読み込みに失敗しました。</td></tr>';
  });

// --- 履歴削除機能 ---
deleteButton.addEventListener('click', async () => {
    const memberIdToDelete = deleteMemberIdInput.value.trim();
    if (!memberIdToDelete) {
        alert('削除する会員番号を入力してください。');
        return;
    }

    if (confirm(`会員番号: ${memberIdToDelete} の配布履歴を本当に削除しますか？\nこの操作は元に戻せません。`)) {
        try {
            await db.collection(collectionName).doc(memberIdToDelete).delete();
            alert('履歴を削除しました。');
            deleteMemberIdInput.value = '';
        } catch (error) {
            console.error("Error deleting document: ", error);
            alert('削除中にエラーが発生しました。');
        }
    }
});

// --- CSV出力機能 ---
function convertToCSV(data) {
    const headers = "配布日時,会員番号,担当スタッフ";
    const rows = data.map(row => {
        const date = row.distributedAt.toDate().toLocaleString('ja-JP');
        return `"${date}","${row.memberId}","${row.staffName}"`;
    });
    return `${headers}\n${rows.join('\n')}`;
}

csvExportButton.addEventListener('click', () => {
    if (allHistoryData.length === 0) {
        alert('出力するデータがありません。');
        return;
    }

    const csvData = convertToCSV(allHistoryData);
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM (文字化け対策)
    const blob = new Blob([bom, csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const now = new Date();
    const fileName = `distribution_history_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.csv`;
    link.setAttribute('download', fileName);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
