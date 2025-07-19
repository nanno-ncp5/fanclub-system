const historyTableBody = document.getElementById('history-table-body');
const deleteMemberIdInput = document.getElementById('delete-member-id-input');
const deleteButton = document.getElementById('delete-button');
const csvExportButton = document.getElementById('csv-export-button');
const searchInput = document.getElementById('search-input');
const resetButton = document.getElementById('reset-button');
const collectionName = "distributions";

// ▼▼▼ このパスワードを必ず変更してください ▼▼▼
const RESET_PASSWORD = "ncp5"; // リセット操作用のパスワード

let allHistoryData = [];

// --- ★★★ここから追加★★★ ---
// 全角英数字を半角に変換する関数
function toHalfWidth(str) {
    return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
}
// --- ★★★ここまで追加★★★ ---


// --- 履歴をリアルタイムで表示 ---
db.collection(collectionName).orderBy('distributedAt', 'desc')
  .onSnapshot(snapshot => {
    historyTableBody.innerHTML = '';
    allHistoryData = [];

    if (snapshot.empty) {
        historyTableBody.innerHTML = '<tr><td colspan="3">まだ配布履歴がありません。</td></tr>';
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
        `;
        historyTableBody.appendChild(tr);
    });
  }, error => {
    console.error("Error fetching history: ", error);
    historyTableBody.innerHTML = '<tr><td colspan="3">履歴の読み込みに失敗しました。</td></tr>';
  });

// --- 検索機能 ---
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const rows = historyTableBody.getElementsByTagName('tr');

    for (const row of rows) {
        const memberIdCell = row.cells[1];
        if (memberIdCell) {
            const memberIdText = memberIdCell.textContent.toLowerCase();
            if (memberIdText.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    }
});

// --- 全履歴リセット機能 ---
resetButton.addEventListener('click', async () => {
    const inputPassword = prompt("全履歴をリセットします。パスワードを入力してください：");

    if (inputPassword === null) return;

    // --- ▼▼▼ ここを変更 ▼▼▼ ---
    const normalizedInput = toHalfWidth(inputPassword).trim(); // 入力された文字を半角に変換し、前後の空白を削除
    if (normalizedInput !== RESET_PASSWORD) {
    // --- ▲▲▲ ここを変更 ▲▲▲ ---
        alert("パスワードが違います。");
        return;
    }

    if (confirm("本当によろしいですか？すべての配布履歴が完全に削除され、元に戻すことはできません。")) {
        try {
            const querySnapshot = await db.collection(collectionName).get();
            const batch = db.batch();
            querySnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            alert("全履歴をリセットしました。");
        } catch (error) {
            console.error("Error resetting history: ", error);
            alert("リセット中にエラーが発生しました。");
        }
    }
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
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
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
