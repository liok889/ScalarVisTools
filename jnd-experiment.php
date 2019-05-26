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

	$timeToStimulus = time() - $_SESSION['time'];
	$userid = $_SESSION['user'];
	$sql = "UPDATE user SET timeToStimulus=" . $timeToStimulus . " WHERE userid=" . $userid;
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
			background-color: #eeeeee;
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
			border: solid 4px #eeeeee;
		}
		#divRight {
			border: solid 4px #eeeeee;
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

		/* ========================================
		 * Modal stuff
		 * ========================================
		 */
		 /* The Modal (background) */
		.modal {
		  display: none; /* Hidden by default */
		  position: fixed; /* Stay in place */
		  z-index: 1; /* Sit on top */
		  padding-top: 200px; /* Location of the box */
		  left: 0;
		  top: 0;
		  width: 100%; /* Full width */
		  height: 100%; /* Full height */
		  overflow: auto; /* Enable scroll if needed */
		  background-color: rgb(0,0,0); /* Fallback color */
		  background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
		}

		/* Modal Content */
		.modal-content {
		  background-color: #fefefe;
		  margin: auto;
		  padding: 20px;
		  border: 1px solid #888;
		  width: 80%;
		}

		/* The Close Button */
		.close {
		  color: #aaaaaa;
		  float: right;
		  font-size: 28px;
		  font-weight: bold;
		}

		.close:hover,
		.close:focus {
		  color: #000;
		  text-decoration: none;
		  cursor: pointer;
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
				
				<p>&nbsp;

				<p>Terrain is steeper when there is larger CHANGE in elevation between adjacent locations in the map.<!-- That is, elevation changes more quickly as you move across the map.  -->
				
				<p>Click on the map that shows STEEPER terrain on average. Press the <u>Confirm</u> button to submit choice and get a new pair of maps.

				<p>&nbsp;

				<!-- The Modal -->
				<div id="myModal" class="modal">

				  <!-- Modal content -->
				  <div class="modal-content" style="font-size: 22px">
				    <span class="close">&times;</span>
				    <p><span id="modalText1">Doing great! Feel free to take a moment to rest your eyes if you wish.</span> </p>
				    <p id="modalText2">There are <span>Num</span> sets left.</p>
				  </div>
				</div>

			</div>

		</div>

		<div style="height: 230px">
			<div id="divLeft" style="width: 210px; height: 210px; float: left">
				<canvas id="stimLeft" width="200" height="200"></canvas>
			</div>
			
			<div id="divColorScale" style="width: 90; height: 210px; float: right;">
				<div style="color: #666666; margin-left: 15px; margin-top: 35px; font-size: 13px">
					high<br>elevation<br><canvas id="colorScaleCanvas" width="25" height="100"></canvas><br>low<br>elevation
				</div>
			</div>

			<div id="divRight" style="width: 210px; height: 210px; float: right;">
				<canvas id="stimRight" width="200" height="200"></canvas>
			</div>

		</div>

		<div style="text-align: center; margin-top: 0px; margin-right: 60px">
			<div>
				<span id="alert" style="font-weight: bold; color: #db0000; font-size: 14px; visibility: hidden">Select one of the two maps!</span><br>
				<button id="confirmButton">Confirm</button>
				<br><img id="loadingImage" width="80" src="img/loading2.gif">
			</div>
			<div style="text-align: center; font-size: 14px">
				Study progress:
				<br>
				<svg id="svgProgress" width="150" height="12" style="margtin-top: 5px; background-color: #cccccc">
					<rect id="rectProgress" height="12" width="15" style="fill: #46a1fc"></rect>
				</svg>
				<span id="labelProgress">10%</span>
			</div>
		</div>
	</div>

	<script type="text/javascript">
		var modal = document.getElementById("myModal");

		// Get the <span> element that closes the modal
		var span = document.getElementsByClassName("close")[0];

		function displayModal() {
			modal.style.display = "block";
		}
		var _modalCallback = null;
		function setModalCallback(_callback) {
			_modalCallback = _callback;
		}

		// When the user clicks on <span> (x), close the modal
		span.onclick = function() {
			var originalDisplay = modal.style.display;
		  	modal.style.display = "none";
		  	if (originalDisplay == 'block') {
		  		console.log("close modal");
		  		if (_modalCallback) {
		  			_modalCallback();
		  		}
		  	}
		}

		// When the user clicks anywhere outside of the modal, close it
		window.onclick = function(event) 
		{
		  if (event.target == modal) 
		  {
		  	var originalDisplay = modal.style.display;
		  	modal.style.display = "none";
		  	if (originalDisplay == 'block') {
		  		console.log("close modal");
		  		if (_modalCallback) {
		  			_modalCallback();
		  		}
		  	}
		  }
		}

	</script>
	<script type="text/javascript">

		// trial config
		var COLORMAP = <?php echo "'" . $_SESSION['condition'] . "';\n"; ?>
		var MAGNITUDES = [2.0, 3.5, 5.0];
		var COLORMAPS = [];
		var START_DIFF = 3.0;
		var TRIAL_COUNT = 50;

		// engagements
		var ENGAGEMENT_CHECKS = 4;
		var ENGAGEMENT_DIFF = 13.0;

		// stepping
		var STEP = 0.5/1.75;
		var BACKWARD = 3.0*STEP;
		var FORWARD = STEP;

		// border style 
		var BORDER_STYLE = '4px solid blue';


		var selectedImage = null;
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

		d3.select("#confirmButton")
			.on('click', function() {
				if (!selectedImage) {
					d3.select("#alert").style('visibility', 'visible');
					//alert("Please answer by clicking one of the two maps.");
				}
				else
				{
					d3.select("#alert").style('visibility', 'hidden');
					var result = experiment.answer(selectedImage);
				}
				d3.event.stopPropagation();

			})
			.on('mousedown', function() {
				d3.event.stopPropagation();				
			})

		d3.select("body").on('mousedown', function() { unselect(); });

		var experiment = null;

		// set periodic timeout to poll heartbeat
		function heartbeat()
		{
			setTimeout(function() {
				if (experiment) {
					$.post('php/heartbeat.php', {
						totalComplete: experiment.totalCount,
						totalAll: TRIAL_COUNT * MAGNITUDES.length
					}, function(data, status) {
						console.log("heartbeat: " + data + ", status: " + status);
					});
				}
				heartbeat();			
			}, 15*1000);
		}

		$(document).ready(function() 
		{
			experiment = new Experiment(false, COLORMAP);
		
			window.onbeforeunload = function() { return "Your work will be lost."; };

			setModalCallback(function() {
				experiment.resumeBlock();
			});
			experiment.setBlockPause(function(blockIndex) {
				var left = MAGNITUDES.length-blockIndex;
				var text2 = null;
				if (left == 1) {
					text2 = "Only 1 set remaining.";
				}
				else
				{
					text2 = "There are " + left + " sets remaining.";

				}

				d3.select("#modalText2").html(text2);
				if (blockIndex == 2)
				{
					d3.select("#modalText1").html("Almost finished. You may rest for a moment if you wish.");
				}
				displayModal();
			});
		
			heartbeat();

		});
	</script>
</body>
</html>