$(function () {
    // =================================================================
    // ★設定エリア（本番用）
    // =================================================================
    
    // ① 奥様の公式LINEのLIFF ID
    // （例：1657771746-xxxxxxx）
    const MY_LIFF_ID = "1660734162-KM7yyz77"; 

    // ② さっき発行した、新しいGASのURL
    // ★注意：必ずシングルクォーテーション(')で囲ってください！
    const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxuuQKUoS6ApDqoJ2seJmAyoSsH7OBvxEDilI1lUk2rY6fPL8npZx-kKJ9L2syRKvPc/exec';

    // =================================================================

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

    // カレンダー処理
    $('#form-number').click(function () { $('#form-name').empty(); });
    let currentBaseDate = new Date();
    currentBaseDate.setDate(currentBaseDate.getDate() - currentBaseDate.getDay());
    let bookedSlots = [];

    // ★読み込み処理
    function fetchAndRender() {
        $('#loadingMsg').show();
        const bustCache = '?t=' + new Date().getTime();
        
        fetch(GAS_API_URL + bustCache)
            .then(response => response.json())
            .then(data => {
                console.log("取得データ:", data); // 確認用ログ
                bookedSlots = data;
                renderCalendar(currentBaseDate);
                $('#loadingMsg').hide();
            })
            .catch(error => {
                console.error("読み込みエラー:", error);
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
        $('#currentMonthDisplay').text((baseDate.getMonth() + 1) + "月");
        let weekDates = [];
        let tempDate = new Date(baseDate);
        for (let i = 0; i < 7; i++) {
            let m = tempDate.getMonth() + 1; let d = tempDate.getDate(); let w = tempDate.getDay();
            let fullDate = `${tempDate.getFullYear()}/${m}/${d}`; 
            weekDates.push({ fullDate: fullDate });
            let color = (w === 0) ? 'text-danger' : (w === 6) ? 'text-primary' : '';
            $header.append(`<th class="${color}">${d}<br><small>(${days[w]})</small></th>`);
            tempDate.setDate(tempDate.getDate() + 1);
        }
        const timeList = [];
        for (let h = 9; h <= 17; h++) { timeList.push(h + ":00"); timeList.push(h + ":30"); }
        timeList.forEach(timeStr => {
            let row = `<tr><td class="bg-light font-weight-bold">${timeStr}</td>`;
            weekDates.forEach((dateObj) => {
                let dObj = new Date(dateObj.fullDate + " " + timeStr);
                let checkKey = dateObj.fullDate + " " + timeStr;
                let wholeDayKey = dateObj.fullDate + " 休"; 
                if (bookedSlots.includes(wholeDayKey) || bookedSlots.includes(checkKey) || dObj < now) {
                    row += `<td><div class="time-slot-ng"><span class="symbol-ng">×</span></div></td>`;
                } else {
                    row += `<td><div class="time-slot" data-date="${dateObj.fullDate}" data-time="${timeStr}"><span class="symbol-ok">〇</span></div></td>`;
                }
            });
            $body.append(row + '</tr>');
        });
    }
    fetchAndRender(); // 初回実行

    $('#prevWeek').on('click', function(e){ e.preventDefault(); currentBaseDate.setDate(currentBaseDate.getDate() - 7); renderCalendar(currentBaseDate); });
    $('#nextWeek').on('click', function(e){ e.preventDefault(); currentBaseDate.setDate(currentBaseDate.getDate() + 7); renderCalendar(currentBaseDate); });
    $(document).on('click', '.time-slot', function() {
        $('.selected-slot').removeClass('selected-slot'); $(this).addClass('selected-slot');
        $('#selected_date').val($(this).data('date')); $('#selected_time').val($(this).data('time'));
    });

    // =================================================================
    // 送信処理
    // =================================================================
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
                console.log("タイムアウト：強制完了");
                showSuccessScreen();
            }
        }, 2000); 
    });

    $('#hidden_iframe').on('load', function() {
        if(submitted) {
            showSuccessScreen();
        }
    });

    // ★完了画面＆メッセージ送信
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
