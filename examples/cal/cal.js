// MIT License.
// Based on GAL 9000 by Google (http://www.apache.org/licenses/LICENSE-2.0), released under the Apache license.
window.util = window.url || {};

util.max = function(array) {
	var max = array[0];
	var len = array.length;
	for (var i = 0; i < len; ++i) {
		if (array[i] > max) {
			max = array[i];
		}
	}
	return max;
};

util.average = function(array) {
	var sum = 0;
	var len = array.length;
	for (var i = 0; i < len; ++i) {
		sum += array[i];
	}
	return sum / len;
};

function Sound() {
	var MIX_TO_MONO = false;
	var NUM_SAMPLES = 2048;

	var self_ = this;

	var context_ = new (window.AudioContext || window.webkitAudioContext)();
	var source_ = null;
	var arrayBuffers_ = [];
	var gain_ = null;
	var analyser_ = null;
	var reqId_ = null;
	var heights = [];
	var BAR_WIDTH = 10, HISTORY_WIDTH = 5;
	var NUM_BARS = Math.floor(380/BAR_WIDTH);

	this.playing = false;
	this.selectedBar = null;
	this.hoverBar = null;

	gain_ = context_.createGainNode();
	gain_.gain.value = 1;
	analyser_ = context_.createAnalyser();

	function processAudio_() {
		var freqByteData = new Uint8Array(analyser_.frequencyBinCount);
		analyser_.getByteFrequencyData(freqByteData);

		var percent = Math.max(Math.min((util.max(freqByteData) / 250) * 100, 105), 30);
		if (!self_.playing) {
			percent = 100;
		}

		gradient.style.backgroundSize = '76% 41%, 55% 100%, ' + percent + '%, ' + percent + '%';

		self_.processFFT(freqByteData);
		self_.renderFFT();
	}

	this.processFFT = function(freqByteData) {
		var barSkip = Math.floor(freqByteData.length/NUM_BARS);

		var currentHeights = [];
		heights.push(currentHeights);
		if (heights.length*HISTORY_WIDTH >= 850) heights = heights.slice(1);

		for (var i = 0; i < NUM_BARS; i++) {
			var magnitude = 0;
			for (var j=0; j<barSkip; j++) {
				magnitude += freqByteData[i*barSkip+j]/barSkip;
			}
			currentHeights[i] = magnitude/150*150;
		}
	};

	this.renderFFT = function() {
		if (heights.length > 0) {
			var currentHeights = heights[heights.length-1];
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			if (this.hoverBar !== null) {
				ctx.fillStyle = ctx.strokeStyle = 'hsl(0, 0%, 90%)';
				ctx.fillRect(460+this.hoverBar*BAR_WIDTH, 0, BAR_WIDTH, 250);
			}

			if (this.selectedBar !== null) {
				ctx.fillStyle = ctx.strokeStyle = 'hsl(0, 80%, 90%)';
				// if (this.hoverBar !== null && this.selectedBar !== this.hoverBar) {
					// ctx.fillRect(460+this.hoverBar*BAR_WIDTH + BAR_WIDTH/2, 0, BAR_WIDTH/2, 250);
				// } else {
					ctx.fillRect(460+this.selectedBar*BAR_WIDTH, 0, BAR_WIDTH, 250);
				// }
			}

			if (this.hoverBar !== null) {
				ctx.fillStyle = ctx.strokeStyle = 'hsl(0, 0%, 60%)';
			} else {
				ctx.fillStyle = ctx.strokeStyle = 'hsl(0, 0%, 10%)';
			}

			for (var i = 0; i < NUM_BARS; i++) {
				if (i !== this.selectedBar && i !== this.hoverBar) {
					ctx.fillRect(460+i*BAR_WIDTH, 250-currentHeights[i], BAR_WIDTH, currentHeights[i]);
				}
			}

			if (this.hoverBar !== null) {
				ctx.fillStyle = ctx.strokeStyle = 'hsl(0, 0%, 10%)';
				ctx.fillRect(460+this.hoverBar*BAR_WIDTH, 250-currentHeights[this.hoverBar], BAR_WIDTH, currentHeights[this.hoverBar]);
			}

			if (this.selectedBar !== null) {
				if (this.hoverBar !== null && this.selectedBar !== this.hoverBar) {
					ctx.fillStyle = ctx.strokeStyle = 'hsl(0, 80%, 75%)';
					ctx.fillRect(460+this.selectedBar*BAR_WIDTH, 250-currentHeights[this.selectedBar], BAR_WIDTH, currentHeights[this.selectedBar]);
					ctx.fillStyle = ctx.strokeStyle = 'hsl(0, 80%, 45%)';
					ctx.fillRect(460+this.hoverBar*BAR_WIDTH + BAR_WIDTH/2, 250-currentHeights[this.selectedBar], BAR_WIDTH/2, currentHeights[this.selectedBar]);
					self_.renderHistory(this.selectedBar, this.hoverBar);

				} else {
					ctx.fillStyle = ctx.strokeStyle = 'hsl(0, 80%, 45%)';
					ctx.fillRect(460+this.selectedBar*BAR_WIDTH, 250-currentHeights[this.selectedBar], BAR_WIDTH, currentHeights[this.selectedBar]);
					self_.renderHistory(this.selectedBar, this.selectedBar);
					
				}
			}

			if (this.hoverBar !== null && this.hoverBar !== this.selectedBar) {
				ctx.strokeStyle = 'hsl(0, 0%, 10%)';
				self_.renderHistory(this.hoverBar, this.hoverBar);
			}
		}
	};

	this.renderHistory = function(bar, posBar) {
		if (heights.length > 1) {
			var x = 460+posBar*BAR_WIDTH;
			ctx.beginPath();
			ctx.moveTo(x + BAR_WIDTH/2, 250-heights[heights.length-1][bar]);
			x -= HISTORY_WIDTH;
			ctx.lineWidth = 3;
			ctx.lineCap = 'round';
			for (var i = heights.length-2; i >= 0 && x >= 0; i--) {
				ctx.lineTo(x + BAR_WIDTH/2, 250-heights[i][bar]);
				x -= HISTORY_WIDTH;
			}
			ctx.stroke();
		}
	};

	this.initAudio = function(num) {
		if (this.playing) {
			self_.stop();
		}

		source_ = context_.createBufferSource();
		source_.looping = false;

		// Use async decoder if it is available (M14).
		if (context_.decodeAudioData) {
			context_.decodeAudioData(arrayBuffers_[num], function(buffer) {
				source_.buffer = buffer;
				self_.play();
			}, function(e) {
				console.error(e);
			});
		} else {
			source_.buffer = context_.createBuffer(arrayBuffers_[num], MIX_TO_MONO);
			self_.play();
		}
	};

	this.load = function(num, url) {
		var request = new XMLHttpRequest();
		request.open('GET', url, true);
		request.responseType = 'arraybuffer';
		request.onload = function(e) {
			arrayBuffers_[num] = request.response;
			if (num === 0) {
				self_.initAudio(0);
			}
		};
		request.send();
	};

	this.play = function() {
		// Connect the processing graph: source -> gain -> analyser -> destination
		source_.connect(gain_);
		gain_.connect(analyser_);
		analyser_.connect(context_.destination);

		source_.noteOn(0);
		this.playing = true;
		
		(function callback() {
			processAudio_();
			reqId_ = window.webkitRequestAnimationFrame(callback);
		})();
	};

	this.stop = function() {
		source_.noteOff(0);
		source_.disconnect(0);
		gain_.disconnect(0);
		analyser_.disconnect(0);
		this.playing = false;
		window.webkitCancelRequestAnimationFrame(reqId_);
	};

	this.findBar = function(x, y) {
		if (heights.length > 0) {
			var bar = Math.floor((x-10)/BAR_WIDTH);
			if (bar >= 0 && bar < heights[0].length) {
				return bar;
			}
		}
		return null;
	};

	this.scrubMove = function(x, y, down) {
		var bar = self_.findBar(x, y);
		if (down) {
			this.wasSet = (bar !== null && bar === this.selectedBar);
			this.hoverBar = this.selectedBar = bar;
		} else {
			this.hoverBar = self_.findBar(x, y);
		}
		self_.renderFFT();

		if (this.hoverBar !== null && this.selectedBar !== null && this.hoverBar !== this.selectedBar) {
			$('#plot-compare').show();
			$('#plot-compare').css('left', this.hoverBar*BAR_WIDTH);
		} else {
			$('#plot-compare').hide();
		}
	};

	this.scrubTap = function(x, y) {
		var bar = self_.findBar(x, y);
		if (this.wasSet) {
			this.selectedBar = null;
		} else {
			this.selectedBar = bar;
		}
		self_.renderFFT();
	};

	this.scrubLeave = function() {
		this.hoverBar = null;
		self_.renderFFT();
		$('#plot-compare').hide();
	};

	this.sliderChanged = function(value, down) {
		$('#volume-label').text(Math.round(value*2) + '%');
		if (gain_) {
			gain_.gain.value = value/50;
		}
	};

	this.sliderLeave = function() {
		$('#volume-label').text('volume');
	};
}

var gradient = document.querySelector('#hal .inner .inner');
var canvas = document.getElementById('plot-canvas');
var ctx = canvas.getContext('2d');
var sound = new Sound();
var scrubbable = new clayer.Scrubbable($('#plot-overlay'), sound);
var slider = new clayer.Slider($('#volume-slider'), sound, 5);
slider.setValue(50);

var showMoveMe = setTimeout(function() {
	$('#moveme').show();
}, 17*1000);

var Hal = function() { return this.init.apply(this, arguments); };
Hal.prototype = {
	init: function($element, $button, x, y) {
		this.$element = $element;
		$button.css('left', x);
		$button.css('top', y);
		this.updatePosition(x, y);
		this.moved = false;
	},

	dragMove: function(x, y) {
		this.updatePosition(x, y);
		if (!this.moved) {
			this.moved = true;
			sound.initAudio(1);
			if (showMoveMe !== null) {
				showMoveMe = null;
				$('#moveme').hide();
			}
		}
	},

	dragEnd: function() {
		this.moved = false;
	},

	updatePosition: function(x, y) {
		var position = $('#hal-button-container').position();
		this.$element.css('left', x-125+position.left);
		this.$element.css('top', y-240+position.top);
	}
};

var halKnob = new clayer.DragKnob($('#hal-button'), new Hal($('#hal'), $('#hal-button'), 175, 190), $('#hal-button-container'));

$(function() {
	clayer.initBody();
	sound.load(0, 'cal0.wav');
	sound.load(1, 'cal1.wav');
});
