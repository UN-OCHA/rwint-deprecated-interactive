(function () {

'use strict';

// Keep a reference of the global object (window or exports).
var root = window;

// SimpleChart.
var SimpleChart = root.SimpleChart = {};

// Bind a function: (Function, Object) -> Function.
SimpleChart.bind = function (fn, obj) {
  var args = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2) : null;
  return function () {
    return fn.apply(obj, args || arguments);
  };
};

// Merge properties of given objects.
SimpleChart.extend = function (target) {
  var sources = Array.prototype.slice.call(arguments, 1),
      i, l, property, source;
  for (i = 0, l = sources.length; i < l; i++) {
    source = sources[i] || {};
    for (property in source) {
      if (source.hasOwnProperty(property)) {
        target[property] = source[property];
      }
    }
  }
  return target;
};

/**
 * Simple Class.
 */
SimpleChart.Class = function() {};

// Extend a class.
SimpleChart.Class.extend = function (properties) {
  properties = properties || {};

  // Extended class.
  var NewClass = function () {
    if (this.initialize) {
      this.initialize.apply(this, arguments);
    }
  };

  // Instantiate the class without calling the constructor.
  var Instance = function () {};
  Instance.prototype = this.prototype;

  var prototype = new Instance();
  prototype.constructor = NewClass;

  NewClass.prototype = prototype;

  // Inherit the parent's static properties.
  for (var property in this) {
    if (this.hasOwnProperty(property) && property !== 'prototype') {
      NewClass[property] = this[property];
    }
  }

  // Merge static properties.
  if (properties.statics) {
    SimpleChart.extend(NewClass, properties.statics);
    delete properties.statics;
  }

  // Merge includes.
  if (properties.includes) {
    SimpleChart.extend.apply(null, [prototype].concat(properties.includes));
    delete properties.includes;
  }

  // Merge options.
  if (properties.options && prototype.options) {
    properties.options = SimpleChart.extend({}, prototype.options, properties.options);
  }

  // Merge properties into the prototype.
  SimpleChart.extend(prototype, properties);

  // Parent.
  NewClass._super = this.prototype;

  NewClass.prototype.setOptions = function (options) {
    this.options = SimpleChart.extend({}, this.options, options);
  };

  return NewClass;
};

// Add properties to the prototype.
SimpleChart.Class.include = function (properties) {
  SimpleChart.extend(this.prototype, properties);
};

// Merge options into the default ones.
SimpleChart.Class.mergeOptions = function (options) {
  SimpleChart.extend(this.prototype.options, options);
};

/**
 * Animation functions.
 */
SimpleChart.Animation = {
  linear: function (t) {
    return t;
  },
  easeInQuad: function (t) {
    return t * t;
  },
  easeOutQuad: function (t) {
    return -1 * t * (t - 2);
  },
  easeInOutQuad: function (t) {
    if ((t /= 1 / 2) < 1) { return 1 / 2 * t * t; }
    return -1 / 2 * ((--t) * (t - 2) - 1);
  },
  easeInCubic: function (t) {
    return t * t * t;
  },
  easeOutCubic: function (t) {
    return 1 * ((t = t / 1 - 1) * t * t + 1);
  },
  easeInOutCubic: function (t) {
    if ((t /= 1 / 2) < 1) { return 1 / 2 * t * t * t; }
    return 1 / 2 * ((t -= 2) * t * t + 2);
  },
  easeInQuart: function (t) {
    return t * t * t * t;
  },
  easeOutQuart: function (t) {
    return -1 * ((t = t / 1 - 1) * t * t * t - 1);
  },
  easeInOutQuart: function (t) {
    if ((t /= 1 / 2) < 1) { return 1 / 2 * t * t * t * t; }
    return -1 / 2 * ((t -= 2) * t * t * t - 2);
  },
  easeInQuint: function (t) {
    return 1 * (t /= 1) * t * t * t * t;
  },
  easeOutQuint: function (t) {
    return 1 * ((t = t / 1 - 1) * t * t * t * t + 1);
  },
  easeInOutQuint: function (t) {
    if ((t /= 1 / 2) < 1) { return 1 / 2 * t * t * t * t * t; }
    return 1 / 2 * ((t -= 2) * t * t * t * t + 2);
  },
  easeInSine: function (t) {
    return -1 * Math.cos(t / 1 * (Math.PI / 2)) + 1;
  },
  easeOutSine: function (t) {
    return 1 * Math.sin(t / 1 * (Math.PI / 2));
  },
  easeInOutSine: function (t) {
    return -1 / 2 * (Math.cos(Math.PI * t / 1) - 1);
  },
  easeInExpo: function (t) {
    return (t === 0) ? 1 : 1 * Math.pow(2, 10 * (t / 1 - 1));
  },
  easeOutExpo: function (t) {
    return (t === 1) ? 1 : 1 * (-Math.pow(2, -10 * t / 1) + 1);
  },
  easeInOutExpo: function (t) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    if ((t /= 1 / 2) < 1) { return 1 / 2 * Math.pow(2, 10 * (t - 1)); }
    return 1 / 2 * (-Math.pow(2, -10 * --t) + 2);
  },
  easeInCirc: function (t) {
    if (t >= 1) { return t; }
    return -1 * (Math.sqrt(1 - (t /= 1) * t) - 1);
  },
  easeOutCirc: function (t) {
    return 1 * Math.sqrt(1 - (t = t / 1 - 1) * t);
  },
  easeInOutCirc: function (t) {
    if ((t /= 1 / 2) < 1) { return -1 / 2 * (Math.sqrt(1 - t * t) - 1); }
    return 1 / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1);
  },
  easeInElastic: function (t) {
    var s = 1.70158;
    var p = 0;
    var a = 1;
    if (t === 0) { return 0; }
    if ((t /= 1) === 1) { return 1; }
    if (!p) { p = 1 * 0.3; }
    if (a < Math.abs(1)) {
      a = 1;
      s = p / 4;
    }
    else {
      s = p / (2 * Math.PI) * Math.asin(1 / a);
    }
    return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p));
  },
  easeOutElastic: function (t) {
    var s = 1.70158;
    var p = 0;
    var a = 1;
    if (t === 0) { return 0; }
    if ((t /= 1) === 1) { return 1; }
    if (!p) { p = 1 * 0.3; }
    if (a < Math.abs(1)) {
      a = 1;
      s = p / 4;
    }
    else {
      s = p / (2 * Math.PI) * Math.asin(1 / a);
    }
    return a * Math.pow(2, -10 * t) * Math.sin((t * 1 - s) * (2 * Math.PI) / p) + 1;
  },
  easeInOutElastic: function (t) {
    var s = 1.70158;
    var p = 0;
    var a = 1;
    if (t === 0) { return 0; }
    if ((t /= 1 / 2) === 2) { return 1; }
    if (!p) { p = 1 * (0.3 * 1.5); }
    if (a < Math.abs(1)) {
      a = 1;
      s = p / 4;
    }
    else {
      s = p / (2 * Math.PI) * Math.asin(1 / a);
    }
    if (t < 1) { return -0.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p)); }
    return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p) * 0.5 + 1;
  },
  easeInBack: function (t) {
    var s = 1.70158;
    return 1 * (t /= 1) * t * ((s + 1) * t - s);
  },
  easeOutBack: function (t) {
    var s = 1.70158;
    return 1 * ((t = t / 1 - 1) * t * ((s + 1) * t + s) + 1);
  },
  easeInOutBack: function (t) {
    var s = 1.70158;
    if ((t /= 1 / 2) < 1) { return 1 / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)); }
    return 1 / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2);
  },
  easeInBounce: function (t) {
    return 1 - SimpleChart.Animation.easeOutBounce(1 - t);
  },
  easeOutBounce: function (t) {
    if ((t /= 1) < (1 / 2.75)) {
      return 1 * (7.5625 * t * t);
    }
    else if (t < (2 / 2.75)) {
      return 1 * (7.5625 * (t -= (1.5 / 2.75)) * t + 0.75);
    }
    else if (t < (2.5 / 2.75)) {
      return 1 * (7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375);
    }
    else {
      return 1 * (7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375);
    }
  },
  easeInOutBounce: function (t) {
    if (t < 1 / 2) { return SimpleChart.Animation.easeInBounce(t * 2) * 0.5; }
    return SimpleChart.Animation.easeOutBounce(t * 2 - 1) * 0.5 + 1 * 0.5;
  }
};

/**
 * Base Chart.
 */
SimpleChart.Chart = SimpleChart.Class.extend({
  options: {
    labels: [],
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontSize: 12,
    fontFamily: 'arial',
    fontColor: '#666',
    formatDataValue: function (value) { return value.toString(); },
    animation: true,
    animationLength: 1,
    animationEasing: 'easeOutQuart'
  },

  initialize: function (target, data, options) {
    this.setOptions(options);

    if (data) {
      if (typeof target === 'string') {
        this.canvas = document.querySelector(target);
      }
      else if (typeof target === 'object' && target.tagName === 'CANVAS') {
        this.canvas = target;
      }

      if (this.canvas) {
        this.data = data;
        this.context = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.initializeDrawing();

        if (!this.options.animation) {
          this.draw(1);
        }
        else {
          this.animate();
        }
      }
    }
  },

  // To override.
  draw: function (animationStep) {
    return animationStep;
  },

  animate: function () {
    var self = this,
        animationFunction = SimpleChart.Animation[this.options.animationEasing],
        animationLength = this.options.animationLength * 60,
        animationProgress = 0,
        requestAnimationFrame = window.requestAnimationFrame ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame ||
          window.oRequestAnimationFrame ||
          window.msRequestAnimationFrame ||
          function(callback) { window.setTimeout(callback, 1000 / 60); };

    requestAnimationFrame(function render () {
      var progress = animationFunction(animationProgress / animationLength);
      self.draw(progress < 0 ? 0 : (progress > 1 ? 1 : progress));
      if (++animationProgress < animationLength && progress !== 1) {
        requestAnimationFrame(render);
      }
    });
  }
});

/**
 * Bar Chart.
 */
SimpleChart.AxesChart = SimpleChart.Chart.extend({
  options: {
    inverse: false,
    scalePadding: 5,
    scaleStepMin: 0,
    scaleStepMax: null,
    scaleStepHop: null,
    scaleDrawGrid: true,
    scaleGridLineWidth: 1,
    scaleGridLineColor: 'rgba(0, 0, 0, 0.1)',
    scaleAxisLineWidth: 1,
    scaleAxisLineColor: 'rgba(0, 0, 0, 0.1)'
  },

  initializeDrawing: function () {
    var context = this.context,
        options = this.options,
        padding = options.scalePadding,
        width = this.width,
        height = this.height,
        labels = options.labels,
        labelCount = labels.length,
        labelHeight = options.fontSize,
        labelWidth = 0,
        labelWidthMax = 0,
        formatDataValue = options.formatDataValue,
        stepMaxWidth,
        stepMinWidth,
        i;

    // Set context font.
    context.font = options.fontStyle + ' ' + options.fontWeight + ' ' + options.fontSize + 'px ' + options.fontFamily;

    // Value Boundaries.
    this.valueBounds = this.calculateValueBounds();

    // Step Boundaries.
    this.steps = this.calculateStepBounds(this.valueBounds.min, this.valueBounds.max);

    // Get Y axis label max width.
    stepMaxWidth = context.measureText(formatDataValue(this.steps.max)).width;
    stepMinWidth = context.measureText(formatDataValue(this.steps.min)).width;
    labelWidthMax = (stepMaxWidth > stepMinWidth) ? stepMaxWidth : stepMinWidth;
    this.yAxisOffsetX = labelWidthMax + padding;

    // Get X axis label max width.
    for (i = 0, labelWidthMax = 0; i < labelCount; i++) {
      labelWidth = context.measureText(labels[i]).width;
      labelWidthMax = (labelWidth > labelWidthMax) ? labelWidth : labelWidthMax;
    }

    // Calculate label angle and X axis offset.
    this.cellWidth = (width - this.yAxisOffsetX) / labelCount;
    if (this.cellWidth < labelWidthMax) {
      if (this.cellWidth < Math.cos(45) * labelWidthMax) {
        this.xAxisLabelsAngle = 90;
        this.xAxisOffsetY = labelWidthMax;
      }
      else {
        this.xAxisLabelsAngle = 45;
        this.xAxisOffsetY = Math.sin(45) * labelWidthMax;
      }
    }
    else {
      this.xAxisLabelsAngle = 0;
      this.xAxisOffsetY = labelHeight;
    }
    this.xAxisOffsetY = height - this.xAxisOffsetY - padding;

    // Prepare axis steps.
    this.prepareSteps();

    // Calculate step height.
    this.cellHeight = (this.xAxisOffsetY - (labelHeight / 2)) / this.steps.count;

    // Prepare the data (format label, calculate position etc.).
    this.prepareData();
  },

  calculateValueBounds: function () {
    var i, l, j, m, value,
        data = this.data,
        valueMax = Number.MIN_VALUE,
        valueMin = Number.MAX_VALUE;

    for (i = 0, l = data.length; i < l; i++) {
      for (j = 0, m = data[i].length; j < m; j++) {
        value = data[i][j];
        if (value > valueMax) { valueMax = value; }
        if (value < valueMin) { valueMin = value; }
      }
    }

    return {
      min: valueMin,
      max: valueMax
    };
  },

  calculateStepBounds: function (valueMin, valueMax) {
    var scaleStepHop = this.options.scaleStepHop,
        scaleStepMin = this.options.scaleStepMin,
        scaleStepMax = this.options.scaleStepMax,
        orderOfMagnitude, stepMin, stepMax,
        stepHop, stepRange, stepCount;

    orderOfMagnitude = Math.floor(Math.log(Math.abs(valueMax) - Math.abs(valueMin)) / Math.LN10);

    stepHop = scaleStepHop || Math.pow(10, orderOfMagnitude);
    stepMin = Math.floor(valueMin / stepHop) * stepHop;
    stepMax = Math.ceil(valueMax / stepHop) * stepHop;

    if (scaleStepMin !== null && scaleStepMin < stepMin) {
      stepMin = scaleStepMin;
    }

    if (scaleStepMax !== null && scaleStepMax > stepMax) {
      stepMax = scaleStepMax;
    }

    stepRange = stepMax - stepMin;
    stepCount = Math.ceil(stepRange / stepHop);

    return {
      count: stepCount,
      hop: stepHop,
      min: stepMin,
      max: stepMax
    };
  },

  prepareSteps: function () {
    var options = this.options,
        xAxisOffsetY = this.xAxisOffsetY,
        labelHeight = options.fontSize,
        formatDataValue = options.formatDataValue,
        steps = this.steps,
        stepCount = steps.count,
        stepMin = steps.min,
        stepHop = steps.hop,
        stepRange = steps.max - steps.min,
        stepCountMax = Math.floor(xAxisOffsetY / labelHeight),
        stepLabels = [],
        i;

    if (stepCountMax > 0) {
      while (stepCount > stepCountMax) {
        stepHop *= 2;
        stepCount = Math.ceil(stepRange / stepHop);
      }
    }

    for (i = 0; i <= stepCount; i++) {
      stepLabels.push(formatDataValue(stepMin + (stepHop * i)));
    }
    steps.labels = stepLabels;
    steps.count = stepCount;
    steps.hop = stepHop;

    this.steps = steps;
  },

  // To override.
  prepareData: function () {
  },

  draw: function (animationStep) {
    this.context.clearRect(0, 0, this.width, this.height);
    this.drawScale();
    this.drawData(animationStep);
  },

  drawScale: function () {
    var context = this.context,
        options = this.options,
        padding = options.scalePadding,
        paddingHalf = padding / 2,
        paddingQuarter = padding / 4,
        drawGrid = options.scaleDrawGrid,
        labels = options.labels,
        labelCount = labels.length,
        labelHeight = options.fontSize,
        labelHeightHalf = labelHeight / 2,
        stepCount = this.steps.count,
        stepLabels = this.steps.labels,
        axisLineColor = options.scaleAxisLineColor,
        axisLineWidth = options.scaleAxisLineWidth,
        gridLineColor = options.scaleGridLineColor,
        gridLineWidth = options.scaleGridLineWidth,
        width = this.width,
        yAxisOffsetX = this.yAxisOffsetX,
        xAxisOffsetY = this.xAxisOffsetY,
        xAxisLabelsAngle = this.xAxisLabelsAngle,
        cellWidth = this.cellWidth,
        cellHeight = this.cellHeight,
        xGridOffsetX = yAxisOffsetX - paddingQuarter,
        xGridOffsetW = width,
        yGridOffsetX = cellWidth / 2,
        yGridOffsetY = labelHeightHalf - paddingQuarter,
        yGridOffsetH = xAxisOffsetY + paddingQuarter,
        x, y, i;

    context.fillStyle = options.fontColor;

    // Draw X axis.
    context.lineWidth = axisLineWidth;
    context.strokeStyle = axisLineColor;
    context.beginPath();
    context.moveTo(yAxisOffsetX - paddingHalf, xAxisOffsetY);
    context.lineTo(width, xAxisOffsetY);
    context.stroke();

    // Draw X axis labels and vertical grid.
    context.lineWidth = gridLineWidth;
    context.strokeStyle = gridLineColor;
    context.textAlign = 'center';
    context.textBaseline = 'top';

    x = yAxisOffsetX + yGridOffsetX;
    y = xAxisOffsetY + padding;

    if (xAxisLabelsAngle !== 0) {
      context.textAlign = 'right';
      x -= labelHeightHalf * xAxisLabelsAngle / 90;
      yGridOffsetX += labelHeightHalf * xAxisLabelsAngle / 90;
      xAxisLabelsAngle *= -(Math.PI / 180);
    }

    for (i = 0; i < labelCount; i++) {
      if (xAxisLabelsAngle !== 0) {
        context.save();
        context.translate(x, y);
        context.rotate(xAxisLabelsAngle);
        context.fillText(labels[i], 0, 0);
        context.restore();
      }
      else {
        context.fillText(labels[i], x, y);
      }

      if (drawGrid) {
        context.beginPath();
        context.moveTo(x + yGridOffsetX, yGridOffsetY);
        context.lineTo(x + yGridOffsetX, yGridOffsetH);
        context.stroke();
      }

      x += cellWidth;
    }

    // Draw Y axis.
    context.lineWidth = axisLineWidth;
    context.strokeStyle = axisLineColor;
    context.beginPath();
    context.moveTo(yAxisOffsetX, labelHeightHalf - paddingHalf);
    context.lineTo(yAxisOffsetX, xAxisOffsetY + paddingHalf);
    context.stroke();

    // Draw Y axis labels.
    context.textAlign = 'right';
    context.textBaseline = 'middle';
    context.lineWidth = gridLineWidth;
    context.strokeStyle = gridLineColor;

    x = yAxisOffsetX - padding;
    y = xAxisOffsetY;

    for (i = 0; i <= stepCount; i++) {
      context.fillText(stepLabels[i], x, y);

      if (drawGrid && i > 0) {
        context.beginPath();
        context.moveTo(xGridOffsetX, y);
        context.lineTo(xGridOffsetW, y);
        context.stroke();
      }

      y -= cellHeight;
    }
  }
});

SimpleChart.Bar = SimpleChart.AxesChart.extend({
  options: {
    stacked: false,
    barSpacing: 1,
    barPadding: 5,
    barLineWidth: 2,
    barLineColor: ['rgba(151, 187, 205, 1)'],
    barFillColor: ['rgba(151, 187, 205, 0.6)']
  },

  calculateValueBounds: function () {
    var i, l, j, m, value,
        data = this.data,
        stacked = this.options.stacked,
        valuesMin = [],
        valuesMax = [],
        valuesLength = 0,
        valueMax = Number.MIN_VALUE,
        valueMin = Number.MAX_VALUE;

    for (j = 0, m = data.length; j < m; j++) {
      for (i = 0, l = data[j].length; i < l; i++) {
        value = data[j][i];

        if (stacked) {
          if (i >= valuesLength) {
            valuesMin.push(0);
            valuesMax.push(0);
          }
          if (value > 0) { valuesMax[i] += value; }
          if (value < 0) { valuesMin[i] += value; }
        }
        else {
          if (value > valueMax) { valueMax = value; }
          if (value < valueMin) { valueMin = value; }
        }
      }
      valuesLength = valuesMax.length;
    }

    if (stacked) {
      valueMin = Math.min.apply(null, valuesMin);
      valueMax = Math.max.apply(null, valuesMax);
    }

    return {
      min: valueMin,
      max: valueMax
    };
  },

  prepareData: function () {
    var context = this.context,
        data = this.data,
        newData = [],
        newDataset,
        options = this.options,
        labels = options.labels,
        stacked = options.stacked,
        datasetCount = data.length,
        formatDataValue = this.options.formatDataValue,
        yAxisOffsetX = this.yAxisOffsetX,
        xAxisOffsetY = this.xAxisOffsetY,
        barPadding = options.barPadding,
        barSpacing = options.barSpacing,
        barFillColor = options.barFillColor,
        barLineColor = options.barLineColor,
        barLineWidth = options.barLineWidth,
        barLineWidthHalf = barLineWidth / 2,
        fillColorIsFunction = typeof barFillColor === 'function',
        lineColorIsFunction = typeof barLineColor === 'function',
        fillColor,
        lineColor,
        stepMin = this.steps.min,
        stepHop = this.steps.hop,
        cellWidth = this.cellWidth,
        cellHeight = this.cellHeight / stepHop,
        offsetsPos = [],
        offsetsNeg = [],
        offsetsLength = 0,
        offset = 0,
        barWidth, barOffset,
        i, j, l, value, dataset,
        x, y, h, w, offsetY, offsetH;

    context.lineWidth = barLineWidth;

    barOffset = yAxisOffsetX + barPadding + barLineWidthHalf;
    barWidth = cellWidth - (barPadding * 2);
    if (!stacked) {
      barWidth = (barWidth - (barSpacing * (datasetCount - 1))) / datasetCount;
    }

    offsetY = (stepMin < 0 ? cellHeight * stepMin : 0) + xAxisOffsetY;
    offsetH = (stepMin > 0 ? cellHeight * stepMin : 0);

    w = barWidth - barLineWidth;
    y = offsetY;

    for (j = 0; j < datasetCount; j++) {
      dataset = data[j];
      newDataset = [];

      for (i = 0, l = dataset.length; i < l; i++) {
        value = dataset[i];

        x = barOffset + (cellWidth * i);
        h = (cellHeight * value) - offsetH;

        if (stacked) {
          if (i >= offsetsLength) {
            offsetsPos.push(0);
            offsetsNeg.push(0);
          }
          if (value > 0) {
            offset = offsetsPos[i];
            y = offsetY - offsetsPos[i];
            offsetsPos[i] += h + barLineWidthHalf;
          }
          else {
            offset = offsetsNeg[i];
            y = offsetY - offsetsNeg[i];
            offsetsNeg[i] += h + barLineWidthHalf;
          }
        }

        if (fillColorIsFunction) {
          fillColor = barFillColor.apply(this, [j, i, value]);
        }
        else {
          fillColor = barFillColor[j] || 'rgba(151, 187, 205, 0.6)';
        }

        if (lineColorIsFunction) {
          lineColor = barFillColor.apply(this, [j, i, value]);
        }
        else {
          lineColor = barLineColor[j] || 'rgba(151, 187, 205, 1)';
        }

        newDataset.push({
          value: value,
          label: labels[i] || '',
          valueLabel: formatDataValue(value),
          x: x,
          y: y,
          w: w,
          h: h,
          offset: offset,
          fillColor: fillColor,
          lineColor: lineColor,
        });
      }

      newData.push(newDataset);

      offsetsLength = offsetsPos.length;
      if (!stacked) {
        barOffset += barWidth + barSpacing;
      }
    }

    this.data = newData;
  },

  drawData: function (animationStep) {
    var context = this.context,
        data = this.data,
        barLineWidth = this.options.barLineWidth,
        datasetCount = data.length,
        i, j, l, x, y, h, w,
        item, value, dataset;

    context.lineWidth = barLineWidth;

    for (j = 0; j < datasetCount; j++) {
      dataset = data[j];

      for (i = 0, l = dataset.length; i < l; i++) {
        item = dataset[i];

        value = item.value;

        x = item.x;
        y = item.y + (item.offset * (1 - animationStep));
        w = item.w;
        h = item.h * animationStep;

        context.fillStyle = item.fillColor;
        context.strokeStyle = item.lineColor;

        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x, y - h);
        context.lineTo(x + w, y - h);
        context.lineTo(x + w, y);
        if (barLineWidth > 0) {
          context.stroke();
        }
        context.closePath();
        context.fill();
      }
    }
  }
});

SimpleChart.bar = function (target, data, options) {
  return new SimpleChart.Bar(target, data, options);
};

})(this);