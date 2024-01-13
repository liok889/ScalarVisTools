// Data generators: make up sample scalar field from random noise
function DataGenerator(field, canvas)
{

    if (!field && canvas) {
        this.field = new ScalarField(+canvas.width, +canvas.height);
    }
    else {
        this.field = field;
    }
    this.data = this.field.view;

    if (canvas) {
        this.canvas = canvas;
        this.scalarVis = new ScalarVis(this.field, this.canvas);
    }
}
DataGenerator.prototype.getField = function() {
    return this.field;
}
DataGenerator.prototype.getData = function() {
    return this.data;
}
DataGenerator.prototype.getSeed = function() {
    //console.error("undefined seed");
    return undefined;
}

DataGenerator.prototype.generate = function() {
    console.error("DataGenerator abstract not implemented");
}
DataGenerator.prototype.vis = function()
{
    if (this.scalarVis) {
        this.scalarVis.vis();
    }
}
DataGenerator.prototype.hello = function() {
    console.log("hello");
}

function TerrainGenerator(field, canvas)
{
    // note: terratin generator assumes w=h
    DataGenerator.call(this, field, canvas);
    this.terrainGen = new Terrain(Math.log2(this.field.w-1), this.data);
}
TerrainGenerator.prototype = Object.create(DataGenerator.prototype);
TerrainGenerator.prototype.generate = function(param)
{
    this.terrainGen.generate(1);
    this.field.normalize();
}
TerrainGenerator.prototype.getExp = function() {
    return null;
}
TerrainGenerator.prototype.getNoiseScale = function() {
    return null;
}
TerrainGenerator.prototype.getNoiseOffset = function() {
    return [null,null];
}

function NoiseGenerator(field, canvas, _ns, _exp)
{
    DataGenerator.call(this, field, canvas);
    this.noiseScale = _ns || noiseScale;
    this.exponent = _exp || exponentWeight;
}
NoiseGenerator.prototype = Object.create(DataGenerator.prototype);

NoiseGenerator.prototype.getSeed = function()
{
    return this.seed;
}


NoiseGenerator.prototype.setNoiseScale = function(_ns) {
    this.noiseScale = _ns;
}

NoiseGenerator.prototype.getNoiseScale = function(_ns) {
    return this.noiseScale;
}

NoiseGenerator.prototype.setExp = function(exponent) {
    this.exponent = exponent;
}
NoiseGenerator.prototype.getExp = function(exponent) {
    return this.exponent;
}

NoiseGenerator.prototype.getNoiseOffset = function() {
    return this.offset;
}
NoiseGenerator.prototype.generate = function(_seed, _offset, _scale, _exponent)
{
    // seed
    this.seed = seedNoise(_seed);

    // offset
    this.offset = _offset || [Math.random()*2000-1000, Math.random()*2000-1000];
    setNoiseOffset(this.offset[0], this.offset[1])

    // scale and exponent
    var scale = _scale !== undefined && _scale !== null ? _scale : this.noiseScale;
    var exponent = _exponent !== undefined && _exponent !== null ? _exponent : this.exponent;

    // generate noise
    makeNoise(this.field, scale, exponent);
}
