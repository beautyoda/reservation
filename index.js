$(function () {
    // =================================================================
    // ★設定エリア：ここに成功したGASのURLを貼ってください
    // =================================================================
    const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxWVY5MyHHpeF4Qho8PO6bmOCb3KIUjctsIuA5fUsS0s_iFVmQYhlyx5k1BclLAu9x_dA/exec';

    // フォームの送信先をGASに設定
    $('form').attr('action', GAS_API_URL);

    // LIFF初期化（index.js内でも念のため実行）
    initializeLiff();

    // 既存：お名前の処理
    $('#form-number').click(function () {
        $('#form-name').empty();
        var namelabel = $('input[name="namelabel"]').val();
    });

    // --- カレンダー生成ロジック ---
    let currentBaseDate = new Date();
    // 日曜日から始まるように調整
    currentBaseDate.setDate(currentBaseDate.getDate() - currentBaseDate.getDay());

    const startH = 9;  // 開始 9:00
    const endH = 17;   // 終了 16:00
    
    // ★予約済みリスト（GASから取得したデータをここに入れる）
    let bookedSlots = [];

    // ★GASからデータを取得してカレンダーを描画する関数
    function fetchAndRender() {
        $('#loadingMsg').show();
        
        // キャッシュ対策をしてデータ取得
        const bustCache = '?t=' + new Date().getTime();
        
        fetch(GAS_API_URL + bustCache)
            .then(response => response.json())
            .then(data => {
                console.log("予約済みリスト:", data);
                bookedSlots = data; // データを保存
                renderCalendar(currentBaseDate); // カレンダー描画
                $('#loadingMsg').hide();
            })
            .catch(error => {
                console.error("読み込みエラー:", error);
                // エラーでもカレンダーは描画する
                renderCalendar(currentBaseDate);
                $('#loadingMsg').hide();
            });
    }

    function renderCalendar(baseDate) {
        const $header = $('#dateHeader');
        const $body = $('#timeBody');
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        const now = new Date(); 
        
        $header.empty().append('<th>時間</th>');
        $body.empty();
        
        // 月表示
        let monthText = (baseDate.getMonth() + 1) + "月";
        $('#currentMonthDisplay').text(monthText);

        let weekDates = [];
        let tempDate = new Date(baseDate);

        // ヘッダー（日付）作成
        for (let i = 0; i < 7; i++) {
            let m = tempDate.getMonth() + 1;
            let d = tempDate.getDate();
            let w = tempDate.getDay();
            
            // ★照合用データ (例: 2026/1/10)
            let fullDate = `${tempDate.getFullYear()}/${m}/${d}`; 
            // 表示用データ
            let displayDate = `${tempDate.getFullYear()}年${('0'+m).slice(-2)}月${('0'+d).slice(-2)}日`;
            
            weekDates.push({ fullDate: fullDate, displayDate: displayDate });
            
            let color = (w === 0) ? 'text-danger' : (w === 6) ? 'text-primary' : '';
            $header.append(`<th class="${color}">${d}<br><small>(${days[w]})</small></th>`);
            tempDate.setDate(tempDate.getDate() + 1);
        }

        // ボディ（時間枠）作成
        for (let h = startH; h < endH; h++) {
            let timeStr = `${h}:00`;      // ★シンプル時間（判定・保存用）
            let timeLabel = `${h}：00～`; // 表示用ラベル
            let row = `<tr><td class="bg-light font-weight-bold">${h}:00</td>`;
            
            weekDates.forEach((dateObj) => {
                let dObj = new Date(dateObj.fullDate + " " + timeStr);
                
                // ★判定用キー (例: 2026/1/10 9:00)
                let checkKey = dateObj.fullDate + " " + timeStr;
                
                // 定休日判定（月曜 or 第3火曜）
                let isMonday = (dObj.getDay() === 1);
                let isThirdTuesday = (dObj.getDay() === 2 && Math.ceil(dObj.getDate() / 7) === 3);
                
                // 過去判定
                let isPast = (dObj < now);
                
                // ★予約済み判定（GASデータと照合）
                let isBooked = bookedSlots.includes(checkKey);

                if (isMonday || isThirdTuesday || isPast || isBooked) {
                    // 予約済みなども含めて×にする
                    row += `<td><span class="symbol-ng">×</span></td>`;
                } else {
                    // ★data-time にはシンプルな timeStr (9:00) を入れるように変更
                    row += `<td><div class="time-slot" data-date="${dateObj.fullDate}" data-time="${timeStr}">
                                <span class="symbol-ok">〇</span>
                            </div></td>`;
                }
            });
            $body.append(row + '</tr>');
        }
    }

    // 初回実行（Fetch経由で描画）
    fetchAndRender();

    // 週切り替えボタン
    $('#prevWeek').on('click', function(e){ 
        e.preventDefault(); 
        currentBaseDate.setDate(currentBaseDate.getDate() - 7); 
        renderCalendar(currentBaseDate); 
    });
    $('#nextWeek').on('click', function(e){ 
        e.preventDefault(); 
        currentBaseDate.setDate(currentBaseDate.getDate() + 7); 
        renderCalendar(currentBaseDate); 
    });

    // 日時選択時の動作
    $(document).on('click', '.time-slot', function() {
        $('.selected-slot').removeClass('selected-slot');
        $(this).addClass('selected-slot');
        $('#selected_date').val($(this).data('date'));
        $('#selected_time').val($(this).data('time'));
    });

    // =================================================================
    // 送信処理（隠しフレームを使った確実な送信）
    // =================================================================
    let submitted = false;

    $('form').submit(function (e) {
        // バリデーション
        var date = $('#selected_date').val();
        var minute = $('#selected_time').val();
        
        if(!date || !minute) {
            alert("予約日時を選択してください");
            e.preventDefault(); // ここで止める
            return false;
        }

        // ここでは e.preventDefault() をせずに、フォームをGAS(iframe)へ送信させる
        submitted = true;
        $('input[type="submit"]').prop('disabled', true).val('送信中...');
    });

    // 裏方のiframeが「読み込み完了（送信完了）」したら動く処理
    $('#hidden_iframe').on('load', function() {
        if(submitted) {
            // 値の取得
            var namelabel = $('input[name="namelabel"]').val();
            var date = $('#selected_date').val();
            var minute = $('#selected_time').val();
            var names = $('select[name="names"]').val();
            var inquiries = $('textarea[name="inquiries"]').val();

            // LINEメッセージ作成
            var msg = `＊＊ご予約内容＊＊\nお名前：\n ${namelabel}\n希望日：\n ${date}\n時間：\n ${minute}\nメニュー：\n ${names}\n問い合わせ内容：\n ${inquiries}`;
            
            // LINE送信実行
            sendText(msg);
        }
    });

    // --- LIFF関連関数 ---
    function initializeLiff() {
        // liff.jsでID管理されている場合はそのままでOK
        // もしID指定が必要なら liff.init({ liffId: "..." }) を使う
        if(typeof liff !== 'undefined' && !liff.isLoggedIn()){
            liff.init({ liffId: "LIFF_ID_HERE" }).then(() => {
                if (!liff.isLoggedIn()) { liff.login(); }
            }).catch((err)=>{ console.log(err); });
        }
    }

    function sendText(text) {
        if (!liff.isInClient()) {
            alert('予約が完了しました！');
            window.location.reload();
            return;
        }
        liff.sendMessages([{ 'type': 'text', 'text': text }])
            .then(function () { 
                liff.closeWindow(); 
            })
            .catch(function (error) {
                alert('予約は完了しましたが、LINEメッセージの送信に失敗しました。');
                window.location.reload();
            });
    }
});
