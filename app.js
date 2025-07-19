// --- 初期設定 ---
const staffName = localStorage.getItem('fanclub-staff-name');
const eventId = localStorage.getItem('fanclub-event-id');
const eventName = localStorage.getItem('fanclub-event-name');

if (!staffName || !eventId) {
    window.location.href = 'index.html';
}

document.getElementById('staff-name-display').textContent = staffName;
const eventInfoDiv = document.createElement('div');
eventInfoDiv.className = 'event-info';
eventInfoDiv.innerHTML = `イベント: <strong>${eventName}</strong>`;
document.querySelector('.header').insertAdjacentElement('afterend', eventInfoDiv);

const memberIdInput = document.getElementById('member-id-input');
const submitButton = document.getElementById('submit-button');
const alertMessage = document.getElementById('alert-message');
const totalCountEl = document.getElementById('total-count');
const todayCountEl = document.getElementById('today-count');
const startQrButton = document.getElementById('start-qr-button');
const stopQrButton = document.getElementById('stop-qr-button');

// --- ▼▼▼ Firestoreの参照先を2種類定義 ▼▼▼ ---
// 1. イベントごとの詳細な履歴（日報）
const eventCollectionRef = db.collection("events").doc(eventId).collection("distributions");
// 2. ツアー全体の配布済み名簿
const masterCollectionRef = db.collection("master_distributions");
// --- ▲▲▲ ---

function toHalfWidth(str) {
    if (!str) return "";
    return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
}

// --- カウンター機能（変更なし） ---
function updateCounters() {
    eventCollectionRef.get().then(snap => {
        totalCountEl.textContent = snap.size;
    });

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

// --- ▼▼▼ 配布処理を大幅に更新 ▼▼▼ ---
async function handleDistribution(rawMemberId) {
    const memberId = toHalfWidth(rawMemberId).trim();
    if (!memberId) {
        alert("会員番号を入力してください。");
        memberIdInput.value = '';
        return;
    }
    
    memberIdInput.disabled = true;
    submitButton.disabled = true;

    try {
        // 1. まず「ツアー全体の配布済み名簿」をチェック
        const masterDocRef = masterCollectionRef.doc(memberId);
        const masterDoc = await masterDocRef.get();

        if (masterDoc.exists) {
            // もし名簿に存在したら、配布済みアラートを表示
            const data = masterDoc.data();
            showAlert(`【ツアーで配布済み】\nこの会員は既に「${data.eventName}」で特典を受け取っています。`, 'error');
        } else {
            // 2. 名簿になければ、配布処理を実行
            // データを2箇所に書き込むため、バッチ処理で確実に行う
            const batch = db.batch();

            // 書込データ定義
            const distributionData = {
                memberId: memberId,
                staffName: staffName,
                distributedAt: new Date(),
                eventId: eventId,
                eventName: eventName
            };

            // 2-1. 「イベントごとの日報」に記録
            const eventDocRef = eventCollectionRef.doc(memberId);
            batch.set(eventDocRef, distributionData);

            // 2-2. 「ツアー全体の配布済み名簿」に記録
            batch.set(masterDocRef, distributionData);

            // 3. バッチ処理を実行
            await batch.commit();

            showAlert('配布完了しました！', 'success');
            updateCounters();
        }
    } catch (error) {
        console.error("Error processing distribution: ", error);
        showAlert('エラーが発生しました。コンソールを確認してください。', 'error');
    }

    memberIdInput.value = '';
    memberIdInput.disabled = false;
    submitButton.disabled = false;
    memberIdInput.focus();
}
// --- ▲▲▲ 配布処理の更新ここまで ▲▲▲ ---

function showAlert(message, type) {
    alertMessage.textContent = message;
    alertMessage.className = type;
    alertMessage.style.display = 'block';
    setTimeout(() => { alertMessage.style.display = 'none'; }, 6000); // 少し長めに表示
}

// (QRコードリーダーとイベントリスナーのコードは変更なし)
let html5QrCode = null;
function onScanSuccess(decodedText, decodedResult) { html5QrCode.stop().then(() => { toggleScannerButtons(false); handleDistribution(decodedText); }).catch(err => console.error(err)); }
function onScanFailure(error) {}
function toggleScannerButtons(isScanning) { startQrButton.style.display = isScanning ? 'none' : 'block'; stopQrButton.style.display = isScanning ? 'block' : 'none'; document.getElementById('qr-reader').style.display = isScanning ? 'block' : 'none'; }
startQrButton.addEventListener('click', () => { html5QrCode = new Html5Qrcode("qr-reader"); toggleScannerButtons(true); html5QrCode.start( { facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess, onScanFailure ).catch(err => { alert("カメラの起動に失敗しました。"); toggleScannerButtons(false); }); });
stopQrButton.addEventListener('click', () => { if (html5QrCode) { html5QrCode.stop().then(() => { toggleScannerButtons(false); }).catch(err => console.error(err)); } });
submitButton.addEventListener('click', () => handleDistribution(memberIdInput.value));
memberIdInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { handleDistribution(memberIdInput.value); } });

// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    updateCounters();
    memberIdInput.focus();
});
