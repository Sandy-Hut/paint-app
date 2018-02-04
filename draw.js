/**
 * Created by Sandy on 01/02/18.
 */

(function(){
    var tpl = '<div id="feedback-module" ><div id="sketch"> <canvas id="feedback-canvas"></canvas> </div>';

    $('body').append(tpl);
    var parentCanvas = document.querySelector('#feedback-canvas');
    var ctx = parentCanvas.getContext('2d');

    var sketch = document.querySelector('#sketch');
    var sketch_style = getComputedStyle(sketch);
    parentCanvas.width = parseInt(sketch_style.getPropertyValue('width'));
    parentCanvas.height = parseInt(sketch_style.getPropertyValue('height'));

    // Creating a tmp canvas
    var tmp_canvas = document.createElement('canvas');
    var tmp_ctx = tmp_canvas.getContext('2d');
    tmp_canvas.id = 'tmp_canvas';
    tmp_canvas.width = parentCanvas.width;
    tmp_canvas.height = parentCanvas.height;

    sketch.appendChild(tmp_canvas);

    var mouse = {
        x: 0,
        y: 0
    };
    var start_mouse = {
        x: 0,
        y: 0
    };

    // Pencil Points
    var ppts = [];

    // creating dynamic textarea
    var textarea = document.createElement('textarea');
    textarea.id = 'text_tool';
    textarea.placeholder = 'Enter the text';
    sketch.appendChild(textarea);
    var tempDiv = document.createElement('div');
    tempDiv.id = 'temp_circ';
    sketch.appendChild(tempDiv);
    tempDiv.style.display = 'none';

    // current tool
    var tool = '',
        number_tool=false,
        mouse_moved=false,
        isMouseDown=false,
        showCounters = false,
        color = 'red',
        brush = 2,
        countNum = 1,
        numberCounter = 1,
        highPen = null,
        feedbackCanHeight = parentCanvas.height+'px',
        feedbackCanWidth = parentCanvas.width+'px',
        headerHeight = $('.paint-top-header').height()+'px',
        showCanvas = false,
        history = {
            redo_list: [],
            undo_list: []
        };
    var restoreState = function(canvas, ctx,  pop, push) {
        if(pop.length) {
            saveState(canvas, push, true);
            var restore_state = pop.pop();
            var imgData = new Image();
            imgData.src=restore_state;
            imgData.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(imgData, 0, 0);
            }
        }
    };
    var saveState = function(canvas, list, keep_redo) {
        keep_redo = keep_redo || false;
        if(!keep_redo) {
            history.redo_list = [];
        }

        (list || history.undo_list).push(canvas.toDataURL());
        if(history.redo_list.length) {
            $('#redo,#undoall').css({'opacity':'1','pointer-events':'auto'});
        } else {
            $('#redo').css({'opacity':'0.5','pointer-events':'none'});
        }
        if(history.undo_list.length) {
            $('#undo,#undoall').css({'opacity':'1','pointer-events':'auto'});
        } else {
            $('#undo').css({'opacity':'0.5','pointer-events':'none'});
        }
    };
    var undo = function(canvas, ctx) {
        restoreState(canvas, ctx, history.undo_list, history.redo_list);
    };
    var redo = function(canvas, ctx) {
        restoreState(canvas, ctx, history.redo_list, history.undo_list);
    };
    var undoAll = function(canvas, ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        countNum = 1;
        numberCounter = 1;
        $('.re-create-tools').css({'opacity':'0.5','pointer-events':'none'});
    };
    $('.re-create-tools').css({'opacity':'0.5','pointer-events':'none'});

    // undo, redo and undoall functionalities
    $('.re-create-tools').on('click', function(e) {
        e.stopPropagation();
        if(textarea) {
            textarea.style.display = 'none';
            tempDiv.style.display = 'none';
        }
        var toolId = $(this).attr('id');
        if(toolId === 'undo') {
            undo(parentCanvas, ctx);
        } else if(toolId === 'redo') {
            redo(parentCanvas, ctx);
        } else if(toolId === 'undoall') {
            undoAll(parentCanvas, ctx);
        }
    });

    // show and hide canvas drawing
    $('.canvas-hide-show').on('click', function(){
        showHideCanvas($(this));
    });
    // show title on hover
    $('.canvas-eye').on('mouseover','.sa-eye', function(){$(this).attr('title','Show');})
    $('.canvas-eye').on('mouseover', '.sa-eye-invisible', function(){$(this).attr('title','Hide');})

    var showHideCanvas = function(thisVal) {
        $('.trans-shade').remove();
        if(textarea) {
            textarea.style.display = 'none';
            textarea.value = '';
            tempDiv.style.display = 'none';
        }
        if(!showCanvas){
            var transparentShade = '<div style="width:'+feedbackCanWidth+';height:'+(parseInt(feedbackCanHeight)-parseInt(headerHeight))+'px'+';position:absolute;z-index:10000;top:'+headerHeight+'" class="trans-shade"></div>';
            $('#sketch').append(transparentShade);
            $('#feedback-canvas').css('opacity','0');
            $('.dropdown-custom,.tools-btn').css({'opacity':'0.5','pointer-events':'none'});
            thisVal.find('i').addClass('sa-eye');
            thisVal.find('i').removeClass('sa-eye-invisible');
            thisVal.attr('title','Hide');
            showCanvas = true;
        } else {
            $('.trans-shade').remove();
            $('#feedback-canvas').css('opacity','1');
            $('.dropdown-custom,.tools-btn').css({'opacity':'1','pointer-events':'auto'});
            thisVal.find('i').addClass('sa-eye-invisible');
            thisVal.find('i').removeClass('sa-eye');
            thisVal.attr('title','Show');
            showCanvas = false;
        }
    };
    //Numbers counting with every shape
    $('.numbers-tool').on('click', function(e){
        number_tool = true;
        showCounters = false;
        tool = '';
        e.stopPropagation();
        $('ul.dropdown-menu-custom').hide();
        activeTool($(this));
    });

    $('.tools-btn').on('click', function(e) {
        showCounters = true;
        $('#tmp_canvas').css('cursor','crosshair');
        e.stopPropagation();
        $('.canvas-hide-show').css({'opacity':'1','pointer-events':'auto'});
        if(textarea) {
            textarea.style.display = 'none';
            textarea.value = '';
            tempDiv.style.display = 'none';
        }
        $('ul.dropdown-menu-custom').hide();
        tool = $(this).attr('id');
        if(tool==='number')showCounters = false;
        if($(this).attr('data-tool')==='number'){number_tool=false;}
        tmp_ctx.lineWidth = brush;
        if(color && tool != shade && tool != highlighter) {
            tmp_ctx.strokeStyle = color;
            tmp_ctx.fillStyle = color;
        }
        if(checkIEBrowser()>0){
            //if(tool=='pencil' || tool==='highlighter') {
            //    $('#tmp_canvas').css({'cursor':'url("images/pencil.ico"), none'});
            //} else if(tool==='eraser') {
            //    selectEraser(brush);
            //} else {
            //    $('#tmp_canvas').css('cursor','crosshair');
            //}
        } else {
            //if(tool=='pencil' || tool==='highlighter') {
            //    $('#tmp_canvas').css({'cursor':'url("images/sa-pen-flipped.svg"), none'});
            //} else if(tool==='eraser') {
            //    selectEraser(brush);
            //} else {
            //    $('#tmp_canvas').css('cursor','crosshair');
            //}
            activeTool($(this));
        }

    });

    // function to show active tools on header
    var activeTool = function(thisval){
        thisval.parents('.drawing-tools').find('li a').css('background','transparent');
        if(thisval.parent('ul.dropdown-menu-custom').length >= 1) {
            thisval.parent('ul.dropdown-menu-custom').parent('li').find('a.header-icon>i').removeAttr('class').addClass('sa').addClass(thisval.find('i').attr('custom-back'));
            thisval.parent().siblings('a').css('background','#ccc');
        } else {
            thisval.find('a').css('background','#ccc');
        }
        console.log(tool +' : '+ color );
    };

    $('li.dropdown-custom').on('click', function() {
        $('ul.dropdown-menu-custom').hide();
        $(this).find('ul.dropdown-menu-custom').show();
    });
    // color picker
    $('.colors-btn').on('click', function(e) {
        e.stopPropagation();
        $('ul.dropdown-menu-custom').hide();
        tmp_ctx.strokeStyle = $(this).attr('color-code');
        tmp_ctx.fillStyle = $(this).attr('color-code');
        color = tmp_ctx.fillStyle;
        $(this).parent().siblings('a').html('<span class="f-12">Color:</span> ' + '<span style="padding:7px;width:15px;background:'+color+';display:inline-block;vertical-align:middle;"></span>');
    });

    // Changing brush size
    $('.brush-picker').on('click', function(e){
        e.stopPropagation();
        $('ul.dropdown-menu-custom').hide();
        tmp_ctx.lineWidth = parseInt($(this).attr('brush-size'));
        brush = highPen = tmp_ctx.lineWidth;
        if(tool==='eraser'){
            selectEraser(brush);
        }
        $(this).parent().siblings('a').html('<span class="f-12">Size:</span> '+ '<span style="padding:0;padding-top:'+brush+'px;width:15px;background:#000;display:inline-block;vertical-align:middle;"></span>');
    });

    /* Mouse Capturing Work */
    tmp_canvas.addEventListener('mousemove', function(e) {
        mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
        mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;
        if(isMouseDown){mouse_moved = true;}
        if(checkIEBrowser()>0) {
            if(tool=='pencil' || tool==='highlighter') {
                mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY-30 : e.layerY-30;
            }
            if(tool==='eraser') {
                if(brush===15 || brush===20) {
                    mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY-20 : e.layerY-20;
                    mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX+5 : e.layerX+5;
                } else if(brush===10){
                    mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY-35 : e.layerY-35;
                } else {
                    mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY-30 : e.layerY-30;
                }
            }
        } else {
            if(tool==='eraser') {
                if(brush===15 || brush===20) {
                    mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY+10 : e.layerY+10;
                    mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX+10 : e.layerX+10;
                } else if(brush===10){
                    mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY+5 : e.layerY+5;
                    mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX+5 : e.layerX+5;
                }
            }
        }
    }, false);

    parentCanvas.addEventListener('mousemove', function(e) {
        mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
        mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;
    }, false);

    /* Drawing on Paint App */
    tmp_ctx.lineWidth = 2;
    tmp_ctx.lineJoin = 'round';
    tmp_ctx.lineCap = 'round';
    tmp_ctx.strokeStyle = 'red';
    tmp_ctx.fillStyle = 'red';
    //tmp_ctx.globalAlpha = 0.5;

    tmp_canvas.addEventListener('mousedown', function(e) {
        $('ul.dropdown-menu-custom').hide();
        tmp_canvas.addEventListener('mousemove', onPaint, false);
        mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
        mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;
        start_mouse.x = mouse.x;
        start_mouse.y = mouse.y;
        isMouseDown = true;
        mouse_moved = false;
        if(tool){saveState(parentCanvas);}
        if(checkIEBrowser()>0) {
            if(tool=='pencil' || tool==='highlighter') {
                mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY-30 : e.layerY-30;
            }
            if(tool==='eraser') {
                if(brush===15 || brush===20) {
                    mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY-20 : e.layerY-20;
                    mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX+5 : e.layerX+5;
                } else if(brush===10){
                    mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY-35 : e.layerY-35;
                } else {
                    mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY-30 : e.layerY-30;
                }
            }
        } else {
            if(tool==='eraser') {
                if(brush===15 || brush===20) {
                    mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY+10 : e.layerY+10;
                    mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX+10 : e.layerX+10;
                } else if(brush===10){
                    mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY+5 : e.layerY+5;
                    mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX+5 : e.layerX+5;
                }
            }
        }
        if((tool==='text' || tool==='comment') && textarea.value){
            var ta_comp_style = getComputedStyle(textarea);
            var fs = ta_comp_style.getPropertyValue('font-size');
            var ff = ta_comp_style.getPropertyValue('font-family');
            var lh = parseInt(fs);
            var tv = textarea.value;
            creatingText(tmp_ctx, tv, lh, fs, ff);
        }
        ppts.push({
            x: mouse.x,
            y: mouse.y
        });

    }, false);

    tmp_canvas.addEventListener('mouseup', function(e) {
        isMouseDown = false;
        switch (tool) {
            case 'arrow':
                drawArrow();
                break;
            case 'number':
                onPaintNumber();
                break;
            case 'text':
                onPaintText();
                break;
            case 'comment':
                onPaintText();
                break;
        }
        if(showCounters && number_tool && mouse_moved && (tool!='highlighter' && tool!='pencil' && tool!='number' && tool!='eraser' && tool!='text' && tool!='comment')) {
            mouse_moved = false;
            createCounterCanvas();
        }
        if(tool==='text' || tool==='comment') {
            createDivCircle()
        }
        tmp_canvas.removeEventListener('mousemove', onPaint, false);
        // for erasing
        ctx.globalCompositeOperation = 'source-over';

        // Writing down to real canvas now
        ctx.drawImage(tmp_canvas, 0, 0);
        // Clearing tmp canvas
        tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
        // Emptying up Pencil Points
        ppts = [];

    }, false);

    // select eraser
    var selectEraser = function(brushsize) {
        if(checkIEBrowser()>0){
            switch (brushsize) {
                case 2:
                    $('#tmp_canvas').css({'cursor':'url("images/eraser-2.ico"), none'});
                    break;
                case 5:
                    $('#tmp_canvas').css({'cursor':'url("images/eraser-5.ico"), none'});
                    break;
                case 10:
                    $('#tmp_canvas').css({'cursor':'url("images/eraser-10.ico"), none'});
                    break;
                case 15:
                    $('#tmp_canvas').css({'cursor':'url("images/eraser-15.ico"), none'});
                    break;
                case 20:
                    $('#tmp_canvas').css({'cursor':'url("images/eraser-20.ico"), none'});
                    break;
            }
        } else {
            switch (brushsize) {
                case 2:
                    $('#tmp_canvas').css({'cursor':'url("images/eraser-2.png"), none'});
                    break;
                case 5:
                    $('#tmp_canvas').css({'cursor':'url("images/eraser-5.png"), none'});
                    break;
                case 10:
                    $('#tmp_canvas').css({'cursor':'url("images/eraser-10.png"), none'});
                    break;
                case 15:
                    $('#tmp_canvas').css({'cursor':'url("images/eraser-15.png"), none'});
                    break;
                case 20:
                    $('#tmp_canvas').css({'cursor':'url("images/eraser-20.png"), none'});
                    break;
            }
        }
    }
    // check if browser in ie
    var checkIEBrowser = function() {
        var ua = window.navigator.userAgent;

        var msie = ua.indexOf('MSIE ');
        if (msie > 0) {
            // IE 10 or older => return version number
            return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
        }

        var trident = ua.indexOf('Trident/');
        if (trident > 0) {
            // IE 11 => return version number
            var rv = ua.indexOf('rv:');
            return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
        }

        var edge = ua.indexOf('Edge/');
        if (edge > 0) {
            // Edge (IE 12+) => return version number
            return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
        }

        // other browser
        return false;
    };
    // function to create temporary counter to show the it with each shape on canvas
    var createCounterCanvas = function(left, top, lineheight){
        var rect = tmp_canvas.getBoundingClientRect();
        var x = start_mouse.x;
        var y = start_mouse.y;
        if(tool==='text' || tool==='comment'){
            x = left-20;
            y = top-lineheight-15;
        }
        tmp_ctx.font='20px Arial';
        tmp_ctx.fillStyle = color;
        tmp_ctx.beginPath();
        tmp_ctx.arc(x, y, 20, 0, 2 * Math.PI);
        tmp_ctx.fill();
        tmp_ctx.textBaseline = 'top';
        tmp_ctx.fillStyle = '#fff';
        numberCounter <= 9 ? tmp_ctx.fillText(numberCounter, x-5, y-10) : numberCounter > 99 ? tmp_ctx.fillText(numberCounter, x-17, y-10) : tmp_ctx.fillText(numberCounter, x-10, y-10);
        numberCounter++;
    }

    var onPaintLine = function() {

        // Tmp canvas is always cleared up before drawing.
        tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
        tmp_ctx.beginPath();
        tmp_ctx.moveTo(start_mouse.x, start_mouse.y);
        tmp_ctx.lineTo(mouse.x, mouse.y);
        tmp_ctx.stroke();
        tmp_ctx.closePath();

    };
    var onPaintText = function() {

        var x = Math.min(mouse.x, start_mouse.x);
        var y = Math.min(mouse.y, start_mouse.y);

        textarea.style.color = color;
        textarea.style.left = x + 'px';
        textarea.style.top = y + 'px';
        textarea.style.width = '250px';
        textarea.style.height = '60px';

        textarea.style.display = 'block';
        if(tool==='text'){
            textarea.style.background = 'transparent';
            textarea.style.border = '1px dotted #cccccc';
        } else {
            textarea.style.background = '#fffdd0';
            textarea.style.border = 'none';
        }
        document.getElementById('text_tool').focus();
        if(checkIEBrowser()>0) {
            var label = document.createElement('label');
            label.className = 'text-label';
            sketch.appendChild(label);
            $('.text-label').css('pointer-events','none').text('Please enter text');
            $(document).on("keydown", "#text_tool", function () {
                $('.text-label').remove();
            });

            label.style.color = 'red';
            label.style.fontSize = '17px';
            label.style.position = 'absolute';
            label.style.left = (x+5) + 'px';
            label.style.top = y + 'px';

        }
    };

    // creating temporary div circle
    var createDivCircle = function(){
        if(number_tool){
            var x = Math.min(mouse.x, start_mouse.x);
            var y = Math.min(mouse.y, start_mouse.y);
            tempDiv.style.background = color;
            tempDiv.style.left = (x-35) + 'px';
            tempDiv.style.top = (y-35) + 'px';
            tempDiv.style.width = '40px';
            tempDiv.style.height = '30px';
            tempDiv.style.paddingTop = '10px';
            tempDiv.style.font = '20px Arial';
            tempDiv.style.position = 'absolute';
            tempDiv.style.borderRadius = '50%';
            tempDiv.style.color = '#ffffff';
            tempDiv.style.textAlign = 'center';
            tempDiv.style.display = 'block';
            tempDiv.innerHTML = numberCounter;
        }

    };

    var onPaintNumber = function(e) {
        // Tmp canvas is always cleared up before drawing.
        tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
        var rect = tmp_canvas.getBoundingClientRect();
        var x = Math.min(mouse.x, start_mouse.x);
        var y = Math.min(mouse.y, start_mouse.y);
        tmp_ctx.font='20px Arial';
        tmp_ctx.fillStyle = 'red';
        tmp_ctx.beginPath();
        tmp_ctx.arc(x, y, 20, 0, 2 * Math.PI);
        tmp_ctx.fill();
        tmp_ctx.textBaseline = 'top';
        tmp_ctx.fillStyle = '#fff';
        countNum <= 9 ? tmp_ctx.fillText(countNum, x-5, y-10) : countNum > 99 ? tmp_ctx.fillText(countNum, x-17, y-10) : tmp_ctx.fillText(countNum, x-10, y-10);
        countNum++;
    };

    var onPaintCircle = function() {
        // Tmp canvas is always cleared up before drawing.
        tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);

        var x = (mouse.x + start_mouse.x) / 2;
        var y = (mouse.y + start_mouse.y) / 2;

        var radius = Math.max(
                Math.abs(mouse.x - start_mouse.x),
                Math.abs(mouse.y - start_mouse.y)
            ) / 2;

        tmp_ctx.beginPath();
        tmp_ctx.arc(x, y, radius, 0, Math.PI * 2, false);
        tmp_ctx.stroke();
        tmp_ctx.closePath();

    };

    var onPaintBrush = function() {
        if(tool === 'highlighter') {
            if(!highPen){
                tmp_ctx.lineWidth = 15;
            }
            tmp_ctx.strokeStyle = 'rgba(255,255,0,0.5)';
            tmp_ctx.fillStyle = 'rgba(255,255,0,0.5)';
        }
        // Saving all the points in an array
        ppts.push({
            x: mouse.x,
            y: mouse.y
        });

        if (ppts.length < 3) {
            var b = ppts[0];
            tmp_ctx.beginPath();
            tmp_ctx.arc(b.x, b.y, tmp_ctx.lineWidth / 2, 0, Math.PI * 2, !0);
            tmp_ctx.fill();
            tmp_ctx.closePath();

            return;
        }

        // Tmp canvas is always cleared up before drawing.
        tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);

        tmp_ctx.beginPath();
        tmp_ctx.moveTo(ppts[0].x, ppts[0].y);

        for (var i = 1; i < ppts.length - 2; i++) {
            var c = (ppts[i].x + ppts[i + 1].x) / 2;
            var d = (ppts[i].y + ppts[i + 1].y) / 2;

            tmp_ctx.quadraticCurveTo(ppts[i].x, ppts[i].y, c, d);
        }

        // For the last 2 points
        tmp_ctx.quadraticCurveTo(
            ppts[i].x,
            ppts[i].y,
            ppts[i + 1].x,
            ppts[i + 1].y
        );
        tmp_ctx.stroke();

    };

    var onPaintRect = function() {

        // Tmp canvas is always cleared up before drawing.
        tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);

        var x = Math.min(mouse.x, start_mouse.x);
        var y = Math.min(mouse.y, start_mouse.y);
        var width = Math.abs(mouse.x - start_mouse.x);
        var height = Math.abs(mouse.y - start_mouse.y);
        tmp_ctx.strokeRect(x, y, width, height);
    };
    var onPaintShade = function() {
        // Tmp canvas is always cleared up before drawing.
        tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
        tmp_ctx.beginPath();
        var width = Math.abs(mouse.x - start_mouse.x);
        var height = Math.abs(mouse.y - start_mouse.y);
        var x = Math.min(mouse.x, start_mouse.x);
        var y = Math.min(mouse.y, start_mouse.y);
        tmp_ctx.rect(x,y,width,height);
        tmp_ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        tmp_ctx.fillStyle = 'rgba(0,0,0,0.9)';
        tmp_ctx.lineWidth = 0;
        //tmp_ctx.stroke();
        tmp_ctx.fill();
    };
    var onPaintOval = function() {

        // Tmp canvas is always cleared up before drawing.
        tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);

        var x = Math.min(mouse.x, start_mouse.x);
        var y = Math.min(mouse.y, start_mouse.y);

        var w = Math.abs(mouse.x - start_mouse.x);
        var h = Math.abs(mouse.y - start_mouse.y);

        drawEllipse(tmp_ctx, x, y, w, h);
    };

    var onErase = function() {

        // Saving all the points in an array
        ppts.push({
            x: mouse.x,
            y: mouse.y
        });

        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = tmp_ctx.lineWidth;

        if (ppts.length < 3) {
            var b = ppts[0];
            ctx.beginPath();
            ctx.arc(b.x, b.y, ctx.lineWidth / 2, 0, Math.PI * 2, !0);
            ctx.fill();
            ctx.closePath();

            return;
        }

        ctx.beginPath();
        ctx.moveTo(ppts[0].x, ppts[0].y);

        for (var i = 1; i < ppts.length - 2; i++) {
            var c = (ppts[i].x + ppts[i + 1].x) / 2;
            var d = (ppts[i].y + ppts[i + 1].y) / 2;

            ctx.quadraticCurveTo(ppts[i].x, ppts[i].y, c, d);
        }

        // For the last 2 points
        ctx.quadraticCurveTo(
            ppts[i].x,
            ppts[i].y,
            ppts[i + 1].x,
            ppts[i + 1].y
        );
        ctx.stroke();
        //tmp_ctx.lineWidth = 10;

    };
    var onPaint = function() {

        if (tool === 'pencil' || tool === 'highlighter') {
            onPaintBrush();
        } else if (tool === 'circle') {
            onPaintCircle();
        } else if (tool === 'rectangle') {
            onPaintRect();
        } else if (tool === 'eraser') {
            onErase();
        } else if (tool === 'line' || tool === 'arrow') {
            onPaintLine();
        } else if (tool === 'oval') {
            onPaintOval();
        } else if (tool === 'shade') {
            onPaintShade();
        }

    };
    var drawArrow = function() {
        var angle = Math.atan2(mouse.y-start_mouse.y,mouse.x-start_mouse.x);
        tmp_ctx.beginPath();
        tmp_ctx.moveTo(mouse.x+20*Math.cos(angle),mouse.y+20*Math.sin(angle));
        tmp_ctx.lineTo(mouse.x-(brush*3)*Math.cos(angle-Math.PI/4),mouse.y-(brush*3)*Math.sin(angle-Math.PI/4));
        tmp_ctx.lineTo(mouse.x-(brush*3)*Math.cos(angle+Math.PI/4),mouse.y-(brush*3)*Math.sin(angle+Math.PI/4));
        tmp_ctx.closePath();
        tmp_ctx.fillStyle  = color;
        tmp_ctx.fill();
    };
    var drawEllipse = function(ctx, x, y, w, h) {
        var kappa = .5522848,
            ox = (w / 2) * kappa, // control point offset horizontal
            oy = (h / 2) * kappa, // control point offset vertical
            xe = x + w,           // x-end
            ye = y + h,           // y-end
            xm = x + w / 2,       // x-middle
            ym = y + h / 2;       // y-middle

        ctx.beginPath();
        ctx.moveTo(x, ym);
        ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
        ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
        ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
        ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
        ctx.closePath();
        ctx.stroke();
    };
    var creatingText = function(context , text, lineheight, fs, ff) {

        context.font = fs + ' ' + ff;
        var textAreaWidth = document.getElementById("text_tool").scrollWidth;
        var textAreaHeight = document.getElementById("text_tool").scrollHeight;
        var left = parseInt(textarea.style.left);
        var top = parseInt(textarea.style.top);
        context.clearRect(0, 0, context.width, context.height);
        context.save();
        if(tool==='comment'){
            context.fillStyle = '#fffdd0';
        }else{
            context.fillStyle = 'transparent';
        }
        context.fillRect(left, top, textAreaWidth, textAreaHeight);
        var data = wrapLines(context, text, textAreaWidth);
        //wrapText(context, text, left, top, textAreaWidth, lineheight, textAreaHeight);
        context.fillStyle = color;
        context.textBaseline = 'top';
        for(var k=0; k<data.length; k++){
            context.fillText(data[k], left, top);
            top += lineheight;
        }
        context.restore();
        textarea.style.display = 'none';
        tempDiv.style.display = 'none';
        textarea.value = '';
        $('.text-label').remove();
        if(number_tool){
            createCounterCanvas(left, top, lineheight);
        }
    };
    var wrapLines = function(ctx, text, maxWidth) {
        var words = text.split('');
        var lines = [];
        var currentLine = words[0];

        for (var i = 1; i < words.length; i++) {
            var word = words[i];
            var width = ctx.measureText(currentLine + ' ' + word).width;
            if (width < maxWidth) {
                currentLine += '' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    };
})();