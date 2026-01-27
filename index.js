$(function () {
    // =================================================================
    // ★設定エリア
    // =================================================================
    const MY_LIFF_ID = "1660734162-KM7yyz77"; 
    const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzfqsqHIkoWnptl9xF2N9G9Z7mVQp0hvKW-5m1uMgcL3GSrlEtbz0twpXv-OeYzPQpS/exec';
    // =================================================================

    $('form').attr('action', GAS_API_URL);
    const isLineApp = navigator.userAgent.toLowerCase().indexOf('line') !== -1;

    if (typeof liff !== 'undefined') {
        liff.init({ liffId: MY_LIFF_ID }).then(() => {
            if (isLineApp) {
                $('#web-contact-area').hide();
                $('#line-urgent-msg').show();
                $('input[name="user_email"]').prop('required', false);
                $('input[name="user_phone"]').prop('required', false);
                if (!liff.isLoggedIn()) liff.login();
            } else {
                showWebFields();
            }
        }).catch(err => { if (!isLineApp) showWebFields(); });
    } else {
        if (!isLineApp) showWebFields();
    }

    function showWebFields() {
        $('#web-contact-area').show();
        $('input[name="user_email"]').prop('required', true);
        $('input[name="user_phone"]').prop('required', true);
    }

    $('#form-number').click(function () { $('#form-name').empty(); });
    
    // ★カレンダー基準日設定
    let currentBaseDate = new Date();
    
    let bookedSlots = [];

    // ★読み込み処理（キャッシュ対策済み）
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
                renderCalendar(currentBaseDate);
                $('#loadingMsg').hide();
            });
    }

    // ★カレンダー描画機能
    function renderCalendar(baseDate) {
        const $header = $('#dateHeader');
        const $body = $('#timeBody');
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        const now = new Date(); 

        $header.empty().append('<th>時間</th>'); 
        $body.empty();

        // ★ここで「その週の日曜日」まで戻す（日曜日始まりにする）
        let tempDate = new Date(baseDate);
        let dayOfWeek = tempDate.getDay();
        tempDate.setDate(tempDate.getDate() - dayOfWeek); 

        // 月の表示（日曜日の日付を基準に月を表示）
        $('#currentMonthDisplay').text((tempDate.getMonth() + 1) + "月");

        // 1週間分の日付データ作成
        let weekDates = [];
        for (let i = 0; i < 7; i++) {
            let m = tempDate.getMonth() + 1; 
            let d = tempDate.getDate(); 
            let w = tempDate.getDay(); 
            
            // シンプルな日付（1/1）
            let fullDateSimple = `${tempDate.getFullYear()}/${m}/${d}`; 
            // 0埋めした日付（01/01）←スプレッドシート対策
            let mm = ("0" + m).slice(-2);
            let dd = ("0" + d).slice(-2);
            let fullDatePadded = `${tempDate.getFullYear()}/${mm}/${dd}`;

            // 定休日判定（月曜＆第3火曜）
            let isHoliday = false;
            if (w === 1) isHoliday = true;
            if (w === 2 && d >= 15 && d <= 21) isHoliday = true;

            weekDates.push({ 
                fullDateSimple: fullDateSimple,
                fullDatePadded: fullDatePadded,
                isHoliday: isHoliday,
                day: d,
                weekParam: w 
            });

            // ヘッダー装飾
            let colorClass = '';
            if (w === 0) colorClass = 'text-danger';
            else if (w === 6) colorClass = 'text-primary';
            else if (isHoliday) colorClass = 'text-danger';

            $header.append(`<th class="${colorClass}">${d}<br><small>(${days[w]})</small></th>`);
            
            tempDate.setDate(tempDate.getDate() + 1);
        }

        // 時間枠（9:00 - 18:00）
        const timeList = [];
        for (let h = 9; h <= 18; h++) { 
            timeList.push(h + ":00"); 
        }

        timeList.forEach(timeStr => {
            let row = `<tr><td class="bg-light font-weight-bold" style="font-size:10px;">${timeStr}</td>`;
            
            weekDates.forEach((dateObj) => {
                let dObj = new Date(dateObj.fullDateSimple + " " + timeStr);
                
                // ★判定キーを2パターン作る（1/1 10:00 と 01/01 10:00）
                let checkKeySimple = dateObj.fullDateSimple + " " + timeStr;
                let checkKeyPadded = dateObj.fullDatePadded + " " + timeStr;
                let wholeDayKey = dateObj.fullDateSimple + " 休"; 

                // どちらかのキーがスプレッドシートにあれば「×」にする
                let isBooked = bookedSlots.includes(checkKeySimple) || bookedSlots.includes(checkKeyPadded) || bookedSlots.includes(wholeDayKey);

                if (dateObj.isHoliday || isBooked || dObj < now) {
                    let content = '<span class="symbol-ng">×</span>';
                    if (dateObj.isHoliday) {
                        content = '<span class="symbol-ng" style="color:#ff9999; font-size:10px;">休</span>';
                    }
                    row += `<td><div class="time-slot-ng">${content}</div></td>`;
                } else {
                    row += `<td><div class="time-slot" data-date="${dateObj.fullDateSimple}" data-time="${timeStr}"><span class="symbol-ok">〇</span></div></td>`;
                }
            });
            $body.append(row + '</tr>');
        });
    }

    fetchAndRender(); 

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

    // 時間選択
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
