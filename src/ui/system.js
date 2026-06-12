// GameSystem — The System LitRPG notification overlay
// Cold/clinical blue aesthetic, contrasts with warm FireRed UI.
window.GameSystem = (function () {
    var stack = null;
    var queue = [];
    var MAX_VISIBLE = 3;

    function init() {
        if (document.getElementById('system-notify-stack')) return;
        stack = document.createElement('div');
        stack.id = 'system-notify-stack';
        document.body.appendChild(stack);
    }

    function _countVisible() {
        return stack ? stack.querySelectorAll('.sys-notify:not(.fading)').length : 0;
    }

    function _show(message, type) {
        if (!stack) init();
        type = type || 'info';

        if (_countVisible() >= MAX_VISIBLE) {
            queue.push({ message: message, type: type });
            return;
        }

        var el = document.createElement('div');
        el.className = 'sys-notify type-' + type;

        var label = document.createElement('div');
        label.className = 'sys-notify-label';
        label.textContent = '[ THE SYSTEM ]';
        el.appendChild(label);

        var msg = document.createElement('div');
        msg.textContent = message;
        el.appendChild(msg);

        stack.appendChild(el);

        setTimeout(function () {
            el.classList.add('fading');
            setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
                if (queue.length > 0) {
                    var next = queue.shift();
                    _show(next.message, next.type);
                }
            }, 450);
        }, 3000);
    }

    function notify(message, type) {
        _show(message, type || 'info');
    }

    function levelUp(statName, newValue) {
        _show(statName + ' increased to ' + newValue, 'info');
    }

    return { init: init, notify: notify, levelUp: levelUp };
})();
