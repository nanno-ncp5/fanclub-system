// 認証関連の処理をまとめたファイル

const auth = firebase.auth();

// --- ログイン処理 ---
if (document.getElementById('login-button')) {
    document.getElementById('login-button').addEventListener('click', () => {
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        const errorMessageDiv = document.getElementById('error-message');

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // ログイン成功
                window.location.href = 'app.html';
            })
            .catch((error) => {
                // ログイン失敗
                errorMessageDiv.textContent = 'メールアドレスまたはパスワードが違います。';
                errorMessageDiv.style.display = 'block';
            });
    });
}

// --- ログアウト処理 ---
if (document.getElementById('logout-button')) {
    document.getElementById('logout-button').addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut().then(() => {
            // ログアウト成功
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Logout Error:', error);
            alert('ログアウトに失敗しました。');
        });
    });
}

// --- ログイン状態のチェック ---
// ログインが必要なページ（app.html, history.html）で、
// ログインしていなければログインページに強制的に戻す
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            // ユーザーがログインしていない場合
            console.log("User not logged in. Redirecting to login page.");
            // 現在のページがログインページでなければ、リダイレクト
            if (window.location.pathname.split('/').pop() !== 'index.html') {
                window.location.href = 'index.html';
            }
        }
    });
}
