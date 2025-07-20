// ▼▼▼ 冒頭部分（変更なし）▼▼▼
checkAuthState(); 

let staffEmail = '';

auth.onAuthStateChanged((user) => {
    if (user) {
        staffEmail = user.email;
        initializePage();
    }
});
// ▲▲▲ 冒頭部分（変更なし）▲▲▲

function initializePage() {
    const eventId = localStorage.getItem('fanclub-event-id');
    const eventName = localStorage.getItem('fanclub-event-name');

    if (!eventId) {
        alert("イベントが選択されていません。ログインページに戻ります。");
        window.location.href = 'index.html';
        return;
    }
    
    const staffDisplay = document.getElementById('staff-email-display');
    if (staffDisplay) {
        staffDisplay.textContent = staffEmail;
    }
    
    const eventInfoDiv = document.createElement('div');
    eventInfoDiv.className = 'event-info';
    eventInfoDiv.innerHTML = `イベント: <strong>${eventName}</strong>`;
    if (!document.querySelector('.event-info')) {
        document.querySelector('.header').insertAdjacentElement('afterend', eventInfoDiv);
    }

    const memberIdInput = document.getElementById('member-id-input');
    const submitButton = document.getElementById('submit-button');
    const alertMessage = document.getElementById('alert-message');
    const totalCountEl = document.getElementById('total-count');
    const todayCountEl = document.getElementById('today-count');
    const startQrButton = document.getElementById('start-qr-button');
    const stopQrButton = document.getElementById('stop-qr-button');

    const eventCollectionRef = db.collection("events").doc(eventId).collection("distributions");
    const masterCollectionRef = db.collection("master_distributions");

    function toHalfWidth(str) { if (!str) return ""; return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) { return String.fromCharCode(s.charCodeAt(0) - 0xFEE0); }); }

    // --- ▼▼▼ ここからカウンター機能を修正 ▼▼▼ ---
    function updateCounters() {
        // 累計配布数（ツアー全体）をリアルタイムで取得
        masterCollectionRef.onSnapshot(snapshot => {
            totalCountEl.textContent = snapshot.size;
        });

        // 当日配布数（このイベントのみ）をリアルタイムで取得
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        eventCollectionRef
          .where('distributedAt', '>=', startOfDay)
          .where('distributedAt', '<', endOfDay)
          .onSnapshot(snapshot => {
              todayCountEl.textContent = snapshot.size;
          });
    }
    // --- ▲▲▲ カウンター機能の修正ここまで ▲▲▲ ---

    async function handleDistribution(rawMemberId) {
        const memberId = toHalfWidth(rawMemberId).trim();
        if (!memberId) { alert("会員番号を入力してください。"); memberIdInput.value = ''; return; }
        memberIdInput.disabled = true; submitButton.disabled = true;
        try {
            const masterDocRef = masterCollectionRef.doc(memberId);
            const masterDoc = await masterDocRef.get();
            if (masterDoc.exists) {
                const data = masterDoc.data();
                const previousEventName = data.eventName || '以前のイベント';
                showAlert(`【ツアーで配布済み】\nこの会員は既に「${previousEventName}」で特典を受け取っています。`, 'error');
            } else {
                const batch = db.batch();
                const distributionData = { memberId: memberId, staffName: staffEmail, distributedAt: new Date(), eventId: eventId, eventName: eventName };
                const eventDocRef = eventCollectionRef.doc(memberId);
                batch.set(eventDocRef, distributionData); batch.set(masterDocRef, distributionData);
                await batch.commit();
                showAlert('配布完了しました！', 'success'); 
                // updateCounters(); // onSnapshotを使っているので、ここでの呼び出しは不要
            }
        } catch (error) { console.error("Error processing distribution: ", error); showAlert('エラーが発生しました。コンソールを確認してください。', 'error'); }
        memberIdInput.value = ''; memberIdInput.disabled = false; submitButton.disabled = false; memberIdInput.focus();
    }

    function showAlert(message, type) { alertMessage.textContent = message; alertMessage.className = type; alertMessage.style.display = 'block'; setTimeout(() => { alertMessage.style.display = 'none'; }, 6000); }

    let html5QrCode = null;
    function onScanSuccess(decodedText, decodedResult) { html5QrCode.stop().then(() => { toggleScannerButtons(false); handleDistribution(decodedText); }).catch(err => console.error(err)); }
    function onScanFailure(error) {}
    function toggleScannerButtons(isScanning) { startQrButton.style.display = isScanning ? 'none' : 'block'; stopQrButton.style.display = isScanning ? 'block' : 'none'; document.getElementById('qr-reader').style.display = isScanning ? 'block' : 'none'; }
    startQrButton.addEventListener('click', () => { html5QrCode = new Html5Qrcode("qr-reader"); toggleScannerButtons(true); html5QrCode.start( { facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess, onScanFailure ).catch(err => { alert("カメラの起動に失敗しました。"); toggleScannerButtons(false); }); });
    stopQrButton.addEventListener('click', () => { if (html5QrCode) { html5QrCode.stop().then(() => { toggleScannerButtons(false); }).catch(err => console.error(err)); } });
    submitButton.addEventListener('click', () => handleDistribution(memberIdInput.value));
    memberIdInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { handleDistribution(memberIdInput.value); } });

    // --- 初期化処理 ---
    updateCounters();
    memberIdInput.focus();
}
