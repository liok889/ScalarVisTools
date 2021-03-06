<?php

	
	session_start();
	if (!isset($_SESSION['user'])) {
		header("Location: php/user.php");
		exit(0);
	}
	else if ($_SESSION['status'] == 'failed') {
		header("Location: php/exit.php");
		exit(0);
	}

	include 'php/connect.php';

	$timeToPractice = time() - $_SESSION['time'];
	$userid = $_SESSION['user'];
	$sql = "UPDATE user SET timeToPractice=" . $timeToPractice . " WHERE userid=" . $userid;
	mysqli_query($conn, $sql);
	mysqli_close($conn);
	

?><!DOCTYPE html>
<html>
<head>

	<link rel="stylesheet" href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
	<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
	<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>
	<script src="https://d3js.org/d3-queue.v3.min.js"></script>
	<script src="jnd/lib/d3.min.js"></script>
	<script src="https://d3js.org/d3-axis.v1.min.js"></script>

	<script src="jnd/lib/three.min.js"></script>

	<script src="src/scalar.js"></script>
	<script src="src/perlin.js"></script>
	<script src="src/noisegen.js"></script>
	<script src="src/terrain.js"></script>

	<script src="design/src/colormap.js"></script>
	<script src="design/src/gl_pipeline.js"></script>
	<script src="design/src/coloranalysis.js"></script>

	<script src="jnd/src/2afc.js"></script>
	<script src="jnd/src/experiment.js"></script>
	
	<style>
		body {
			background-color: #ffffff;
			font-family: Helvetica;
			font-size: 17px;

			/* disable selection */
			-webkit-user-select: none;
			-moz-user-select: -moz-none;
			-ms-user-select: none;
			user-select: none;
		}

		.uiParentDiv {
			margin-bottom: 10px;
			vertical-align: middle;
		}
		.uiDiv {
			width: 80px;
			display: inline-block;
		}

		.sliderDiv {
			width: 80px;
			height: 5px;
			font-size: 10px;
		}
		.distRect {
			fill: #cccccc;
			stroke: #333333;
			stroke-width: 1px;
		}

		#stimLeft {
			margin: 5px 5px;
		}
		#stimRight {
			margin: 5px 5px;
		}

		#divLeft {
			border: solid 4px #ffffff;
		}
		#divRight {
			border: solid 4px #ffffff;
		}

		#confirmButton 
		{
			font-size: 14px;
			height: 60px;
			width: 110px;
		}

		#divColorScale {
			text-align: center;
		}

	</style>
</head>

<body>
	<div style="width: 650px; margin:0 auto;">
		<div style="margin-bottom: 20px">
			<!--
			<div class="uiParentDiv">
			
				<div class="uiDiv">Gradient<br>magnitude</div>
				<div class="uiDiv sliderDiv" id="sliderMagnitude"></div>
				<div class="uiDiv" id="sliderMagnitudeValue"></div>

			</div>
			
			<div class="uiParentDiv">

				<div class="uiDiv">Diff</div>
				<div class="uiDiv sliderDiv" id="sliderDiff"></div>
				<div class="uiDiv" id="sliderDiffValue"></div>
			</div>

			<div class="uiParentDiv">

				<div class="uiDiv">Exponent</div>
				<div class="uiDiv sliderDiv" id="sliderExponent"></div>
				<div class="uiDiv" id="sliderExponentValue"></div>
			</div>
			-->
			<div class="uiParentDiv">
				
				<div style="font-weight: bold; font-size: 20px; background-color: #eeeeee; border: solid 1px black; width: 100%; height: 40px; padding-top: 20px; padding-bottom: 5px; padding: 5px 5px">
					<span id="practiceLabel">Practice</span>
				</div>
				
				<p>Terrain is steeper when there is larger CHANGE in elevation between adjacent locations in the map.<!-- That is, elevation changes more quickly as you move across the map. -->
				
				<p>Click on the map that shows STEEPER terrain on average. Press the <u>Confirm</u> button to submit choice and get a new pair of maps.

				<p>&nbsp;
			</div>

		</div>

		<div style="height: 230px">
			<div id="divLeft" style="width: 210px; height: 210px; float: left">
				<canvas id="stimLeft" width="200" height="200"></canvas>
			</div>
			
			<div id="divColorScale" style="width: 90; height: 210px; float: right;">
				<div style="margin-top: 35px; font-size: 13px">
					high<br>elevation<br><canvas id="colorScaleCanvas" width="25" height="100"></canvas><br>low<br>elevation
				</div>
			</div>

			<div id="divRight" style="width: 210px; height: 210px; float: right;">
				<canvas id="stimRight" width="200" height="200"></canvas>
			</div>

		</div>

		<div style="text-align: center; margin-top: 0px; margin-right: 50px">
			<div>
				<span id="alert" style="font-weight: bold; color: #db0000; font-size: 17px; visibility: hidden">Select one of the two maps!</span><br>
				<button id="confirmButton">Confirm</button>
				<br><img id="loadingImage1" width="80" src="img/loading2.gif" style="visibility: hidden">
			</div>
			<div style="text-align: center; font-size: 14px">
				Practice progress:
				<br>
				<svg id="svgProgress" width="150" height="12" style="margtin-top: 5px; background-color: #cccccc">
					<rect id="rectProgress" height="12" width="15" style="fill: #46a1fc"></rect>
				</svg>
				<span id="labelProgress">10%</span>
			</div>
		</div>
	</div>

	<script type="text/javascript">
		// trial config
		var COLORMAP = <?php echo "'" . $_SESSION['condition'] . "';\n"; ?>
		var MAGNITUDES = [2.0, 4.0, 3];
		var COLORMAPS = shuffleArray([ 'rainbowjet', 'viridis', 'coolwarm' ]);
		var START_DIFF = 4.0;
		var TRIAL_COUNT = 5;
		var lastBlock = [];

		// engagements
		var ENGAGEMENT_CHECKS = 0;
		var ENGAGEMENT_DIFF = 14.0;

		// stepping
		var STEP = .70 * (0.5/1.75);
		var BACKWARD = 3.0*STEP;
		var FORWARD = STEP;

		var selectedImage = null;
		var PRACTICE = true;
		var FLASH_RATE = 80;
		var BORDER_STYLE = '4px solid blue';
		var BORDER_STYLE_ERROR = '4px solid red';
		var overallAccuracy = 0.0;
		var lastBlockAccuracy = 0.0;

		if (DIFF) {
			DIFF[0] = 0.5;
		}

		for (var i=0; i<TRIAL_COUNT; i++) {
			lastBlock.push(true);
		}

		function getUrlParameter(name) {
			name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
			var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
			var results = regex.exec(location.search);
			return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
		};

		var R = getUrlParameter('r');
		if (R == '1') 
		{
			d3.select("#practiceLabel").html("Practice (2 / 2)");
		}

		function flash() {
			if (!selectedImage) {
				return;
			}
			var theDiv = selectedImage == 'left' ? d3.select('#divLeft') : d3.select('#divRight');
			(function(_theDiv) {
				theDiv.style('border', null)
				setTimeout(function() {
					theDiv.style('border', BORDER_STYLE_ERROR);
					setTimeout(function() {
						theDiv.style('border', null);
						setTimeout(function() {
							theDiv.style('border', BORDER_STYLE_ERROR);
							setTimeout(function() {
								theDiv.style('border', null);
								setTimeout(function() {
									theDiv.style('border', BORDER_STYLE_ERROR);
									setTimeout(function() {
										theDiv.style('border', null);
										setTimeout(function() {
											theDiv.style('border', BORDER_STYLE);
										});
									}, FLASH_RATE);
								}, FLASH_RATE);
							}, FLASH_RATE);
						}, FLASH_RATE);
					}, FLASH_RATE);
				}, FLASH_RATE);
			})(theDiv);
		}

		function unselect() 
		{
			d3.select("#divLeft")
				.style("border", null);
			d3.select("#divRight")
				.style("border", null);
			selectedImage = null;
		}

		d3.select("#divLeft").on("mousedown", function() { 
			d3.select("#divRight").style("border", null);
			d3.select(this).style("border", BORDER_STYLE); 
			selectedImage = 'left';
			d3.event.stopPropagation();

		});
		d3.select("#divRight").on("mousedown", function() { 
			d3.select("#divLeft").style("border", null);
			d3.select(this).style("border", BORDER_STYLE); 
			selectedImage = 'right';
			d3.event.stopPropagation();
		});

		var newStimulus = true;
		d3.select("#confirmButton")
			.on('click', function() 
			{
				if (!selectedImage) {
					d3.select("#alert")
						.style('visibility', 'visible')
						.style("color", '#db0000')
						.html("Select one of the two maps!");
				}
				else
				{
					var currentTrial = experiment.getCurrentTrial();
					var currentBlock = experiment.getCurrentBlock();
					//console.log("currentBlock: " + currentBlock + ', currentTrial: ' + currentTrial);
					
					d3.select("#alert").style('visibility', 'hidden');
					var result = experiment.answer(selectedImage);
					var LAST_BLOCK = ((currentBlock+1) % MAGNITUDES.length == 0);
					if ( LAST_BLOCK ) 
					{
						if (lastBlock[currentTrial]) 
						{
							lastBlock[currentTrial] = result;
						}
					}
					if (newStimulus && result) {
						overallAccuracy += 1.0 / 
							(MAGNITUDES.length * TRIAL_COUNT * (COLORMAPS.length> 0 ? COLORMAPS.length : 1));
					}
					if (!result && PRACTICE) {
						d3.select("#alert")
							.style("visibility", 'visible')
							.style("color", '#db0000')
							.html("Incorrect choice");
						newStimulus = false;
						flash();
					}
					else {
						newStimulus = true;
						d3.select("#alert")
							.style('visibility', 'visible')
							.style('color', '#009933')
							.html("Correct!");
						setTimeout(function() {
							d3.select("#alert").style('visibility', 'hidden');
						}, 1000);
					}

					if (result && LAST_BLOCK && (currentTrial == TRIAL_COUNT-1)) 
					{
						//console.log("** lastBlock: " + lastBlock)
						// sum up accuracy of last block and reset
						var acc = 0.0;
						for (var j=0; j<lastBlock.length; j++) {
							if (lastBlock[j]) {
								acc += 1/TRIAL_COUNT;
							}
							lastBlock[j] = true;
						}
						lastBlockAccuracy += acc / (COLORMAPS.length> 0 ? COLORMAPS.length : 1);

					}
				}

				// see if the practice is over
				if (experiment.isFinished()) {
					// compute accuracy in the last block
					var correct = 0;
					for (var i=0; i<lastBlock.length; i++) {
						if (lastBlock[i]) {
							correct++;
						}
					}
					
					// check whether the last block has at least 
					// a miniumum level of accuracy
					if (lastBlockAccuracy >= .66 || overallAccuracy >= .66) 
					{
						window.location.replace('debrief.html')
					}
					else if (!R)
					{
						window.location.replace('jnd-practice.php?r=1');
					}
					else
					{
						// failed 2x in a row
						window.location.replace('php/exit_practice.php');
					}
				}

				d3.event.stopPropagation();

			})
			.on('mousedown', function() {
				d3.event.stopPropagation();				
			})

		d3.select("body").on('mousedown', function() { unselect(); });

		var experiment = null;
		$(document).ready(function() {
			experiment = new Experiment(PRACTICE, COLORMAP);
		})
	</script>
</body>
</html>