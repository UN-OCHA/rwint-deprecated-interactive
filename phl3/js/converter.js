(function () {
  var rABS = typeof FileReader !== "undefined" &&
             typeof FileReader.prototype !== "undefined" &&
             typeof FileReader.prototype.readAsBinaryString !== "undefined";

  var spinner = new Spinner();
  var blobUrl = null;
  var anchor = document.getElementById('anchor');

  function fixdata(data) {
    var o = "",
      l = 0,
      w = 10240;
    for (; l < data.byteLength / w; ++l)
      o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w, l * w + w)));
    o += String.fromCharCode.apply(null, new Uint8Array(data.slice(o.length)));
    return o;
  }

  function xlsxworker(data, cb) {
    var worker = new Worker('js/xlsxworker.js');
    worker.onmessage = function (e) {
      switch (e.data.t) {
      case 'ready':
        break;
      case 'e':
        console.error(e.data.d);
        break;
      case 'xlsx':
        cb(JSON.parse(e.data.d));
        break;
      }
    };
    var arr = rABS ? data : btoa(fixdata(data));
    worker.postMessage({
      d: arr,
      b: rABS
    });
  }


  function sheet_to_csv(sheet, opts) {
          var stringify = function stringify(val) {
                  if(!val.t) return "";
                  if(typeof val.w !== 'undefined') return val.w;
                  switch(val.t){
                          case 'n': return String(val.v);
                          case 's': case 'str': return typeof val.v !== 'undefined' ? val.v : "";
                          case 'b': return val.v ? "TRUE" : "FALSE";
                          case 'e': return val.v; /* throw out value in case of error */
                          default: throw 'unrecognized type ' + val.t;
                  }
          };
          var out = [], txt = "";
          opts = opts || {};
          if(!sheet || !sheet["!ref"]) return "";
          var r = XLSX.utils.decode_range(sheet["!ref"]);
          var fs = opts.FS||",", rs = opts.RS||"\n";
          var cols = [1, 26, 8, 22, 23];

          for(var R = r.s.r + (opts.offset || 0); R <= r.e.r; ++R) {
                  var row = [];
                  //for(var C = r.s.c; C <= r.e.c; ++C) {
                  for (var i = 0, l = cols.length; i < l; i++) {
                          var C = cols[i];
                          var val = sheet[XLSX.utils.encode_cell({c:C,r:R})];
                          if(!val) { row.push(""); continue; }
                          txt = String(stringify(val));
                          if(txt.indexOf(fs)!==-1 || txt.indexOf(rs)!==-1 || txt.indexOf('"')!==-1)
                                  txt = "\"" + txt.replace(/"/g, '""') + "\"";
                          row.push(txt);
                  }
                  out.push(row.join(fs));
          }
          return out.join(rs) + (out.length ? rs : "");
  }


  function to_csv(workbook) {
    var result = [];

    result.push(['date', 'code', 'affectedPeople', 'IDP', 'damagedHouses']);

    workbook.SheetNames.forEach(function (sheetName) {
      var csv = sheet_to_csv(workbook.Sheets[sheetName], {offset: 1});
      if (csv.length > 0) {
        result.push(csv);
      }
    });
    return result.join("\n");

    /*workbook.SheetNames.forEach(function (sheetName) {
      var csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
      if (csv.length > 0) {
        result.push(csv);
      }
    });
    return result.join("\n");*/
  }

  var tarea = document.getElementById('b64data');

  function b64it() {
    var wb = XLSX.read(tarea.value, {
      type: 'base64'
    });
    process_wb(wb);
  }

  function saveBlob(filename, blob) {
    if (window.navigator.msSaveBlob) {
      window.navigator.msSaveBlob(blob, filename);
      return;
    }

    try {
      // revoke previous download url, if any. TODO: do this when download completes (how?)
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = URL.createObjectURL(blob);
    } catch(e) {
      console.log(e);
      alert("Converter can't export files from this browser. Try switching to Chrome or Firefox.");
      return;
    }

    anchor.href = blobUrl;
    anchor.download = filename;
    var clickEvent = document.createEvent("MouseEvent");
    clickEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false,
        false, false, false, 0, null);
    anchor.dispatchEvent(clickEvent);
  }

  function process_wb(wb, name) {
    var output = to_csv(wb);
    saveBlob(name + '.csv', new Blob([output], {type: "text/csv"}));
    spinner.stop();
  }

  function handleFiles(files) {
    var i, l, f, reader, name;

    spinner.spin(document.getElementById('container'));

    for (i = 0, f = files[i], l = 1; i < l; i++) {//l = files.length
      reader = new FileReader();
      name = f.name;

      reader.onload = function (e) {
        var data = e.target.result;
        if (typeof Worker !== 'undefined') {
          xlsxworker(data, process_wb);
        } else {
          var wb;
          if (rABS) {
            wb = XLSX.read(data, {
              type: 'binary'
            });
          } else {
            var arr = fixdata(data);
            wb = XLSX.read(btoa(arr), {
              type: 'base64'
            });
          }
          process_wb(wb, name);
        }
      };

      if (rABS) reader.readAsBinaryString(f);
      else reader.readAsArrayBuffer(f);
    }
  }

  var drop = document.getElementById('drop');

  function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  function handleDragover(e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  if (drop.addEventListener) {
    drop.addEventListener('dragenter', handleDragover, false);
    drop.addEventListener('dragover', handleDragover, false);
    drop.addEventListener('drop', handleDrop, false);
  }

  document.getElementById('input').addEventListener('change', function (event) {
    handleFiles(this.files);
  });

  document.getElementById('dotext').addEventListener('click', function (event) {
    b64it();
  });
})();
