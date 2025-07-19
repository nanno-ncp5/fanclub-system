// --- 初期設定 ---
const staffName = localStorage.getItem('fanclub-staff-name');
const eventId = localStorage.getItem('fanclub-event-id'); // ★イベントIDを取得
const eventName = localStorage.getItem('fanclub-event-name'); // ★イベント名を取得

// スタッフ名かイベントIDがなければTOPページに戻す
if (!staffName || !eventId) {
    window.location.href = 'index.html';
}

// 画面にスタッフ名とイベント名を表示
document.getElementById('staff-name-display').textContent = staffName;
// イベント名を表示する要素をapp.htmlに追加する必要があります。
// 先にapp.htmlを更新しましょう。
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

// ▼▼▼ Firestoreの参照先をイベントごとのサブコレクションに変更 ▼▼▼
const eventCollectionRef = db.collection("events").doc(eventId).collection("distributions");

// 全角英数字を半角に変換するヘルパー関数
function toHalfWidth(str) {
    if (!str) return "";
    return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
}

// --- カウンター機能 ---
function updateCounters() {
    // 累計カウント（選択したイベントの）
    eventCollectionRef.get().then(snap => {
        totalCountEl.textContent = snap.size;
    });

    // 当日カウント
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

// --- 配布処理 ---
async function handleDistribution(rawMemberId) {
    const memberId = toHalfWidth(rawMemberId).trim();
    if (!memberId) {
        alert("会員番号を入力してください。");
        memberIdInput.value = '';
        return;
    }
    
    memberIdInput.disabled = true;
    submitButton.disabled = true;

    const docRef = eventCollectionRef.doc(memberId);
    
    try {
        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data();
            const distributedDate = data.distributedAt.toDate().toLocaleString('ja-JP');
            showAlert(`【配布済み】\nこの会員は既に受け取っています。\n(日時: ${distributedDate} / 担当: ${data.staffName})`, 'error');
        } else {
            await docRef.set({
                memberId: memberId,
                staffName: staffName,
                distributedAt: new Date()
            });
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

function showAlert(message, type) {
    alertMessage.textContent = message;
    alertMessage.className = type;
    alertMessage.style.display = 'block';
    setTimeout(() => { alertMessage.style.display = 'none'; }, 5000);
}

// (QRコードリーダーとイベントリスナーのコードは変更なしなので省略)
// --- QRコードリーダー ---
let html5QrCode = null;
function onScanSuccess(decodedText, decodedResult) { html5QrCode.stop().then(() => { toggleScannerButtons(false); handleDistribution(decodedText); }).catch(err => console.error(err)); }
function onScanFailure(error) {}
function toggleScannerButtons(isScanning) { startQrButton.style.display = isScanning ? 'none' : 'block'; stopQrButton.style.display = isScanning ? 'block' : 'none'; document.getElementById('qr-reader').style.display = isScanning ? 'block' : 'none'; }
startQrButton.addEventListener('click', () => { html5QrCode = new Html5Qrcode("qr-reader"); toggleScannerButtons(true); html5QrCode.start( { facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess, onScanFailure ).catch(err => { alert("カメラの起動に失敗しました。"); toggleScannerButtons(false); }); });
stopQrButton.addEventListener('click', () => { if (html5QrCode) { html5QrCode.stop().then(() => { toggleScannerButtons(false); }).catch(err => console.error(err)); } });
// --- イベントリスナー ---
submitButton.addEventListener('click', () => handleDistribution(memberIdInput.value));
memberIdInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { handleDistribution(memberIdInput.value); } });

// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    updateCounters();
    memberIdInput.focus();
});
