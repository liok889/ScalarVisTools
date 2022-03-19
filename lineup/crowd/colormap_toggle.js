
var COLORMAP_TOGGLE = [
    "blueorange",
    "singlehue"
];

var COLORMAP_LAST_TIME = [Date.now(), Date.now()];
var COLORMAP_TIME = [0, 0]
var CURRENT_COLORMAP_I = 0;
var INITIAL_COLORMAP_I = 0;
var COLORMAP_SWITCH_COUNT = 0;


function resetColormapToggle(dontChange)
{
    // randomly choose one of the colormaps
    if (!dontChange) {
        var c = Math.random() > 0.5 ? 1 : 0
        CURRENT_COLORMAP_I = c;
        INITIAL_COLORMAP_I = c;
        changeColormap(COLORMAP_TOGGLE[c]);

    }
    COLORMAP_SWITCH_COUNT = 0;
    COLORMAP_TIME = [0, 0];
    COLORMAP_LAST_TIME = [Date.now(), Date.now()]
}

function accumLastColormapTime()
{
    COLORMAP_TIME[CURRENT_COLORMAP_I] += Date.now() - COLORMAP_LAST_TIME[CURRENT_COLORMAP_I]
}

function toggleColormap()
{
    var current = CURRENT_COLORMAP_I;

    // accumilate time

    COLORMAP_TIME[current] += Date.now() - COLORMAP_LAST_TIME[current];

    current++;
    if (current >= COLORMAP_TOGGLE.length) {
        current = 0;
    }
    changeColormap(COLORMAP_TOGGLE[current])
    COLORMAP_LAST_TIME[current] = Date.now();
    CURRENT_COLORMAP_I = current;
    COLORMAP_SWITCH_COUNT++;
}

d3.select(document).on('keydown.toggle', function() {
    if (d3.event.keyCode != 13)
    {
        if (ENABLE_COLOR_TOGGLE) {
            toggleColormap();
        }
    }
});
