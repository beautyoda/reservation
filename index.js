$(function () {
    // =================================================================
    // ★設定エリア（ここだけ書き換えてください！）
    // =================================================================
    
    // ① 奥様の公式LINEのLIFF ID
    // （例：1657771746-xxxxxxx）
    const MY_LIFF_ID = "1660734162-KM7yyz77"; 

    // ② さっき発行した、新しいGASのURL
    // ★注意：必ずシングルクォーテーション(')で囲ってください！
    const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxh2G6hBhi-sz8vSSNwpC_P5_R89ygZWF8ZFW65nJAsCu808ebHa9h1phoPkQNcAGCK/exec';

    // =================================================================

    // フォームの送信先を設定
    $('form').attr('action', GAS_API_URL);
    
    // スマホ判定
    const isLineApp = navigator.userAgent.toLowerCase().indexOf('line') !== -1;

    // LIFF初期化
    if (typeof liff !== 'undefined') {
        liff.init({ liffId: MY_LIFF_ID }).then(() => {
            if (isLineApp) {
                $('#web-contact-area').hide();
                $('#line-urgent-msg').show();
                $('input[name="user_email"]').prop('required', false);
                $('input[name="user_phone"]').prop('required', false);
                
                if (!liff.isLoggedIn()) {
                    liff.login();
                }
            } else {
                showWebFields();
            }
        }).catch(err => {
            // エラー時もWebとして動かす
            if (!isLineApp) showWebFields();
        });
    } else {
        if (!isLineApp) showWebFields();
    }

    function showWebFields() {
        $('#web-contact-area').show();
        $('input[name="user_email"]').prop('required', true);
        $('input[name="user_phone"]').prop('required', true);
    }

    // カレンダー設定
    $('#form-number').click(function () { $('#form-name').empty(); });
    let currentBaseDate = new Date();
    // 常に「今日」からスタートするように調整（日曜始まりではない）
    // ※カレンダーの左端を日曜日に合わせたい場合は以下の行を有効に
    // currentBaseDate.setDate(currentBaseDate.getDate() - currentBaseDate.getDay());
    
    let bookedSlots = [];

    // ★読み込み処理
    function fetchAndRender() {
        $('#loadingMsg').show();
        const bustCache = '?t=' + new Date().getTime();
        
        fetch(GAS_API_URL + bustCache)
            .then(response => response.json())
            .then(data => {
                bookedSlots = data;
                renderCalendar(currentBaseDate);
                $('#loadingMsg').hide();
            })
            .catch(error => {
                console.error("読み込みエラー:", error);
                renderCalendar(currentBaseDate); // エラーでもカレンダーは出す
                $('#loadingMsg').hide();
            });
    }

    // ★カレンダー描画機能（定休日対応版）
    function renderCalendar(baseDate) {
        const $header = $('#dateHeader');
        const $body = $('#timeBody');
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        const now = new Date(); 

        $header.empty().append('<th>時間</th>'); 
        $body.empty();

        $('#currentMonthDisplay').text((baseDate.getMonth() + 1) + "月");

        // 1週間分の日付データを作る
        let weekDates = [];
        let tempDate = new Date(baseDate);
        
        // もし「左端は必ず日曜日」にしたい場合は、ここで調整する
        let dayOfWeek = tempDate.getDay();
        tempDate.setDate(tempDate.getDate() - dayOfWeek); // 日曜日まで戻る

        for (let i = 0; i < 7; i++) {
            let m = tempDate.getMonth() + 1; 
            let d = tempDate.getDate(); 
            let w = tempDate.getDay(); // 0(日)～6(土)
            let fullDate = `${tempDate.getFullYear()}/${m}/${d}`; 
            
            // ★定休日判定ロジック
            let isHoliday = false;
            
            // 1. 毎週月曜 (w === 1)
            if (w === 1) isHoliday = true;

            // 2. 第3火曜 (w === 2 かつ 日付が15～21の間)
            if (w === 2 && d >= 15 && d <= 21) isHoliday = true;

            weekDates.push({ 
                fullDate: fullDate, 
                isHoliday: isHoliday,
                day: d,
                weekParam: w 
            });

            // ヘッダーの色付け
            let colorClass = '';
            if (w === 0) colorClass = 'text-danger'; // 日曜
            else if (w === 6) colorClass = 'text-primary'; // 土曜
            else if (isHoliday) colorClass = 'text-danger'; // 定休日も赤文字

            $header.append(`<th class="${colorClass}">${d}<br><small>(${days[w]})</small></th>`);
            
            tempDate.setDate(tempDate.getDate() + 1);
        }

        // 時間枠を作る (9:00 - 17:30)
        const timeList = [];
        for (let h = 9; h <= 17; h++) { 
            timeList.push(h + ":00"); 
            timeList.push(h + ":30"); 
        }

        timeList.forEach(timeStr => {
            let row = `<tr><td class="bg-light font-weight-bold" style="font-size:10px;">${timeStr}</td>`;
            
            weekDates.forEach((dateObj) => {
                let dObj = new Date(dateObj.fullDate + " " + timeStr);
                let checkKey = dateObj.fullDate + " " + timeStr;
                let wholeDayKey = dateObj.fullDate + " 休"; 
                
                // 定休日、または予約済み、または過去なら「×」
                if (dateObj.isHoliday || bookedSlots.includes(wholeDayKey) || bookedSlots.includes(checkKey) || dObj < now) {
                    
                    let content = '<span class="symbol-ng">×</span>';
                    // 定休日は「休」と表示して区別する
                    if (dateObj.isHoliday) {
                        content = '<span class="symbol-ng" style="color:#ff9999; font-size:10px;">休</span>';
                    }

                    row += `<td><div class="time-slot-ng">${content}</div></td>`;
                } else {
                    row += `<td><div class="time-slot" data-date="${dateObj.fullDate}" data-time="${timeStr}"><span class="symbol-ok">〇</span></div></td>`;
                }
            });
            $body.append(row + '</tr>');
        });
    }

    fetchAndRender(); // 初回実行

    // 週移動ボタン
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

    // 時間選択クリック
    $(document).on('click', '.time-slot', function() {
        $('.selected-slot').removeClass('selected-slot'); 
        $(this).addClass('selected-slot');
        $('#selected_date').val($(this).data('date')); 
        $('#selected_time').val($(this).data('time'));
    });

    // 送信処理
    let submitted = false;
    $('form').submit(function (e) {
        var date = $('#selected_date').val();
        var minute = $('#selected_time').val();
        if(!date || !minute) { alert("予約日時を選択してください"); e.preventDefault(); return false; }

        if (!isLineApp) {
             var phone = $('input[name="user_phone"]').val();
             if (phone && phone.replace(/-/g, '').length !== 11) {
                 alert("電話番号はハイフンなしの11桁で入力してください。"); e.preventDefault(); return false;
             }
        }
        
        submitted = true;
        $('input[type="submit"]').prop('disabled', true).val('送信中...');
        
        // 2秒後に強制完了画面へ
        setTimeout(function(){
            if(submitted) {
                showSuccessScreen();
            }
        }, 2000); 
    });

    $('#hidden_iframe').on('load', function() {
        if(submitted) {
            showSuccessScreen();
        }
    });

    // 完了画面＆LINEメッセージ送信
    function showSuccessScreen() {
        if (!submitted) return; 
        submitted = false; 

        $('#booking-form').hide();
        $('#success-area').show();
        window.scrollTo(0, 0);

        if (isLineApp) {
            var namelabel = $('input[name="namelabel"]').val();
            var date = $('#selected_date').val();
            var minute = $('#selected_time').val();
            var names = $('select[name="names"]').val();
            var inquiries = $('textarea[name="inquiries"]').val();

            var msg = `＊＊ご予約内容＊＊\nお名前：\n${namelabel}\n希望日：\n${date}\n時間：\n${minute}\nメニュー：\n${names}\n問い合わせ内容：\n${inquiries}`;
            
            liff.sendMessages([{ 'type': 'text', 'text': msg }])
                .then(function () { 
                    setTimeout(function(){ liff.closeWindow(); }, 2000);
                })
                .catch(function (error) {
                    console.log("LINE送信失敗:", error);
                });
        }
    }
});
