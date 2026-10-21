.import "../Model.js" as Model

// What the bar shows beside the Todoist icon. "soon" names a timed task from
// a little before its time until it ends, "next" always names today's next
// timed task, and both fall back to today's count; "count" keeps the count
// and "icon" shows the icon alone.
var MODES = ["soon", "next", "count", "icon"];
var LEAD_MS = 15 * 60000;
// How long a task without a duration stays in the bar after its time.
var OPEN_MS = 30 * 60000;
var TITLE_LIMIT = 28;

function mode(value) { return MODES.indexOf(value) >= 0 ? value : "soon"; }
function mine(task, userId) { return Model.active(task) && Model.matches(task, Model.DEFAULT_VIEW, userId, ""); }
function span(task) {
    var due = Model.dueTime(task);
    if (!due || !isFinite(due.getTime())) return null;
    var minutes = task.duration && task.duration.unit === "minute" ? Number(task.duration.amount) || 0 : 0;
    return {start: due.getTime(), end: due.getTime() + (minutes > 0 ? minutes * 60000 : OPEN_MS), timed: minutes > 0};
}

// The timed tasks to name now: one starting within the lead first, then one
// under way, ending soonest first.
function selection(barMode, tasks, userId, nowMs) {
    if (barMode !== "soon" && barMode !== "next") return [];
    var open = [], today = Model.dateKey(new Date(nowMs)), next = null;
    tasks.forEach(function(task) {
        var s = mine(task, userId) ? span(task) : null;
        if (!s) return;
        if (nowMs >= s.start - LEAD_MS && nowMs < s.end) open.push({task: task, span: s, rank: s.start > nowMs ? 1 : 2, order: s.start > nowMs ? s.start : s.end});
        else if (s.start > nowMs && Model.dateKey(new Date(s.start)) === today && (!next || s.start < next.span.start)) next = {task: task, span: s};
    });
    open.sort(function(a, b) { return a.rank - b.rank || a.order - b.order; });
    if (open.length === 0 && barMode === "next" && next) return [next];
    return open;
}

function when(entry, nowMs) {
    var s = entry.span;
    if (nowMs < s.start) {
        var minutes = Math.round((s.start - nowMs) / 60000);
        return minutes <= 0 ? "now" : minutes < 60 ? "in " + minutes + "m" : "at " + Model.clockText(new Date(s.start));
    }
    return s.timed ? "until " + Model.clockText(new Date(s.end)) : "now";
}
// "Call Ana · in 12m  +1"
function label(list, nowMs) {
    if (!list || list.length === 0) return "";
    var title = Model.plain(list[0].task.content);
    if (title.length > TITLE_LIMIT) title = title.substr(0, TITLE_LIMIT - 1).replace(/\s+$/, "") + "…";
    var text = title + " · " + when(list[0], nowMs);
    return list.length > 1 ? text + "  +" + (list.length - 1) : text;
}
function tooltip(list, nowMs) {
    return list.map(function(entry) { return Model.plain(entry.task.content) + " · " + when(entry, nowMs); }).join("\n");
}
