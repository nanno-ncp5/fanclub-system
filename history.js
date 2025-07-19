// --- 診断用ロギング関数 ---
function logToPage(message) {
    const debugOutput = document.getElementById('debug-output');
    if (debugOutput) {
        const p = document.createElement('p');
        p.textContent = `> ${message}`;
        p.style.margin = '0';
        p.style.padding = '0';
        debugOutput.appendChild(p);
        debugOutput.scrollTop = debugOutput.scrollHeight; // 自動スクロール
    }
    console.log(message); // 念のためコンソールにも出力
}

logToPage("history.js スクリプト開始");

// 認証状態の確定を待ってから、ページの処理を開始する
try {
    logToPage("auth.onAuthStateChanged リスナーを設定します...");
    auth.onAuthStateChanged((user) => {
        if (user) {
            logToPage(`認証OK: ユーザー(${user.email})を認識しました。`);
            initializeHistoryPage();
        } else {
            logToPage("認証NG: ユーザーがログインしていません。リダイレクトします。");
            window.location.href = 'index.html';
        }
    });
    logToPage("auth.onAuthStateChanged リスナー設定完了。");
} catch (e) {
    logToPage(`エラー: auth.onAuthStateChanged の設定に失敗しました: ${e.message}`);
}


// ページの全処理をこの関数の中に閉じ込める
function initializeHistoryPage() {
    logToPage("initializeHistoryPage() 関数が呼び出されました。");

    const eventId = localStorage.getItem('fanclub-event-id');
    const eventName = localStorage.getItem('fanclub-event-name');

    if (!eventId) {
        logToPage("エラー: localStorageからイベントIDが見つかりませんでした。");
        alert("イベントが選択されていません。TOPページに戻ります。");
        window.location.href = 'index.html';
        return; 
    }
    logToPage(`イベントID: ${eventId}, イベント名: ${eventName} を取得しました。`);

    const header = document.querySelector('.header h2');
    header.textContent = `配布履歴 (${eventName})`;

    const historyTableBody = document.getElementById('history-table-body');
    const deleteMemberIdInput = document.getElementById('delete-member-id-input');
    const deleteButton = document.getElementById('delete-button');
    const csvExportButton = document.getElementById('csv-export-button');
    const searchInput = document.getElementById('search-input');
    const resetButton = document.getElementById('reset-button');

    const eventCollectionRef = db.collection("events").doc(eventId).collection("distributions");
    logToPage("Firestoreへの参照パスを構築しました。");
    
    const RESET_PASSWORD = "password123"; 
    let allHistoryData = [];

    // --- 履歴をリアルタイムで表示 ---
    logToPage("Firestoreからのデータ取得を開始します (onSnapshot)...");
    eventCollectionRef.orderBy('distributedAt', 'desc')
      .onSnapshot(snapshot => {
        logToPage(`データ受信: ${snapshot.size}件のドキュメントを取得しました。テーブルを更新します。`);
        historyTableBody.innerHTML = '';
        allHistoryData = [];

        if (snapshot.empty) {
            historyTableBody.innerHTML = `<tr><td colspan="3">このイベントの配布履歴はまだありません。</td></tr>`;
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            allHistoryData.push(data);
            const tr = document.createElement('tr');
            const distributedDate = data.distributedAt.toDate().toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            tr.innerHTML = `<td>${distributedDate}</td><td>${data.memberId}</td><td>${data.staffName}</td>`;
            historyTableBody.appendChild(tr);
        });
        logToPage("テーブルの更新が完了しました。");
      }, error => {
        logToPage(`Firestoreエラー: データの取得に失敗しました。理由: ${error.message}`);
        historyTableBody.innerHTML = '<tr><td colspan="3">履歴の読み込みに失敗しました。</td></tr>';
      });

    // --- 各ボタンのイベントリスナー設定 ---
    resetButton.addEventListener('click', () => logToPage("リセットボタンがクリックされました。"));
    searchInput.addEventListener('input', () => logToPage("検索ボックスが入力されました。"));
    deleteButton.addEventListener('click', () => logToPage("削除ボタンがクリックされました。"));
    csvExportButton.addEventListener('click', () => logToPage("CSV出力ボタンがクリックされました。"));
    logToPage("すべてのボタンにリスナーを設定しました。");
}
