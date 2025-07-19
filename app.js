// --- 初期設定 ---
const staffName = localStorage.getItem('fanclub-staff-name');
if (!staffName) {
    window.location.href = 'index.html'; // スタッフ名がなければTOPへ
}

document.getElementById('staff-name-display').textContent = staffName;

const memberIdInput = document.getElementById('member-id-input');
const submitButton = document.getElementById('submit-button');
const alertMessage = document.getElementById('alert-message');
const totalCountEl = document.getElementById('total-count');
const todayCountEl = document.getElementById('today-count');
const startQrButton = document.getElementById('start-qr-button');
const stopQrButton = document.getElementById('stop-qr-button');

const collectionName = "distributions"; // Firestoreのコレクション名

// --- カウンター機能 ---
function updateCounters() {
    // 累計カウント
    db.collection(collectionName).get().then(snap => {
        totalCountEl.textContent = snap.size;
    });

    // 当日カウント
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    db.collection(collectionName)
      .where('distributedAt', '>=', startOfDay)
      .where('distributedAt', '<', endOfDay)
      .onSnapshot(snapshot => {
          todayCountEl.textContent = snapshot.size;
      });
}

// --- 配布処理 ---
async function handleDistribution(memberId) {
    if (!memberId) return;
    
    memberIdInput.disabled = true;
    submitButton.disabled = true;

    const docRef = db.collection(collectionName).doc(memberId);
    
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
            updateCounters(); // 配布後にカウンターを即時更新
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
    alertMessage.className = type; // 'success' or 'error'
    alertMessage.style.display = 'block';

    setTimeout(() => {
        alertMessage.style.display = 'none';
    } , 5000); // 5秒後にメッセージを消す
}

// --- QRコードリーダー ---
let html5QrCode = null;

function onScanSuccess(decodedText, decodedResult) {
    html5QrCode.stop().then(() => {
        toggleScannerButtons(false);
        handleDistribution(decodedText);
    }).catch(err => console.error(err));
}

function onScanFailure(error) {
    // スキャン失敗時は何もしない
}

function toggleScannerButtons(isScanning) {
    startQrButton.style.display = isScanning ? 'none' : 'block';
    stopQrButton.style.display = isScanning ? 'block' : 'none';
    document.getElementById('qr-reader').style.display = isScanning ? 'block' : 'none';
}

startQrButton.addEventListener('click', () => {
    html5QrCode = new Html5Qrcode("qr-reader");
    toggleScannerButtons(true);
    html5QrCode.start(
        { facingMode: "environment" }, // 背面カメラを使用
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        alert("カメラの起動に失敗しました。");
        toggleScannerButtons(false);
    });
});

stopQrButton.addEventListener('click', () => {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            toggleScannerButtons(false);
        }).catch(err => console.error(err));
    }
});

// --- イベントリスナー ---
submitButton.addEventListener('click', () => handleDistribution(memberIdInput.value.trim()));
memberIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleDistribution(memberIdInput.value.trim());
    }
});


// ▼▼▼ ここからが修正箇所です ▼▼▼
// 全角文字の入力をブロックするイベントリスナー
memberIdInput.addEventListener('input', (e) => {
    const input = e.target;
    const originalValue = input.value;
    
    // 全角文字を検知して、すべて除去する
    // 正規表現の末尾の「g」が、すべての文字を対象にするために重要です
    const sanitizedValue = originalValue.replace(/[^\x00-\x7F]/g, '');

    // 値が変更された場合のみ、入力内容を更新する
    if (originalValue !== sanitizedValue) {
        input.value = sanitizedValue;
    }
});
// ▲▲▲ ここまでが修正箇所です ▲▲▲


// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    updateCounters();
    memberIdInput.focus();
});
