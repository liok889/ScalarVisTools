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

function NoiseGenerator(field, canvas, _ns, _exp)
{
    DataGenerator.call(this, field, canvas);
    this.noiseScale = _ns || noiseScale;
    this.exponent = _exp || exponentWeight;
}
NoiseGenerator.prototype = Object.create(DataGenerator.prototype);

NoiseGenerator.prototype.setNoiseScale = function(_ns) {
    this.noiseScale = _ns;
}

NoiseGenerator.prototype.setExp = function(exponent) {
    this.exponent = exponent;
}

NoiseGenerator.prototype.generate = function()
{
    seedNoise();
    makeNoise(this.field, this.noiseScale, this.exponent);
}
