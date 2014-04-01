// Generated by CoffeeScript 1.7.1
(function() {
  var Docco, buildMatchers, commander, configure, defaults, document, format, fs, getLanguage, highlightjs, languages, marked, outputCode, parse, path, run, version, write, _,
    __slice = [].slice;

  document = function(options, callback) {
    var complete, config, copyAsset, files, nextFile, outputFiles, source_infos;
    if (options == null) {
      options = {};
    }
    config = configure(options);
    source_infos = [];
    fs.mkdirsSync(config.output);
    if (config.source) {
      fs.mkdirsSync(config.source);
    }
    callback || (callback = function(error) {
      if (error) {
        throw error;
      }
    });
    copyAsset = function(file, callback) {
      return fs.copy(file, path.join(config.output, path.basename(file)), callback);
    };
    complete = function() {
      return copyAsset(config.css, function(error) {
        if (error) {
          return callback(error);
        } else if (fs.existsSync(config["public"])) {
          return copyAsset(config["public"], callback);
        } else {
          return callback();
        }
      });
    };
    files = config.sources.slice();
    nextFile = function() {
      var source;
      source = files.shift();
      return fs.readFile(source, function(error, buffer) {
        var code, first, firstSection, hasTitle, sections, title;
        if (error) {
          return callback(error);
        }
        code = buffer.toString();
        sections = parse(source, code, config);
        format(source, sections, config);
        firstSection = _.find(sections, function(section) {
          return section.docsText.length > 0;
        });
        if (firstSection) {
          first = marked.lexer(firstSection.docsText)[0];
        }
        hasTitle = first && first.type === 'heading' && first.depth === 1;
        title = hasTitle ? first.text : path.basename(source);
        source_infos.push({
          source: source,
          hasTitle: hasTitle,
          title: title,
          sections: sections
        });
        if (files.length) {
          return nextFile();
        } else {
          return outputFiles();
        }
      });
    };
    outputFiles = function() {
      var i, info, _i, _len;
      for (i = _i = 0, _len = source_infos.length; _i < _len; i = ++_i) {
        info = source_infos[i];
        write(info.source, i, source_infos, config);
        outputCode(info.source, info.sections, config);
      }
      return complete();
    };
    return nextFile();
  };

  parse = function(source, code, config) {
    var codeText, docsText, hasCode, i, ignore_this_block, in_block, isText, lang, line, lines, match, maybeCode, param, raw_line, save, sections, single, _i, _j, _len, _len1;
    if (config == null) {
      config = {};
    }
    lines = code.split('\n');
    sections = [];
    lang = getLanguage(source, config);
    hasCode = docsText = codeText = '';
    param = '';
    in_block = 0;
    ignore_this_block = 0;
    save = function() {
      sections.push({
        docsText: docsText,
        codeText: codeText
      });
      return hasCode = docsText = codeText = '';
    };
    if (lang.literate) {
      isText = maybeCode = true;
      for (i = _i = 0, _len = lines.length; _i < _len; i = ++_i) {
        line = lines[i];
        lines[i] = maybeCode && (match = /^([ ]{4}|[ ]{0,3}\t)/.exec(line)) ? (isText = false, line.slice(match[0].length)) : (maybeCode = /^\s*$/.test(line)) ? isText ? lang.symbol : '' : (isText = true, lang.symbol + ' ' + line);
      }
    }
    for (_j = 0, _len1 = lines.length; _j < _len1; _j++) {
      line = lines[_j];
      if (in_block) {
        ++in_block;
      }
      raw_line = line;
      if (!in_block && config.blocks && lang.blocks && line.match(lang.commentEnter)) {
        line = line.replace(lang.commentEnter, '');
        in_block = 1;
        if (lang.commentIgnore && line.match(lang.commentIgnore)) {
          ignore_this_block = 1;
        }
      }
      single = !in_block && lang.commentMatcher && line.match(lang.commentMatcher) && !line.match(lang.commentFilter);
      if (single) {
        line = line.replace(lang.commentMatcher, '');
        if (lang.commentIgnore && line.match(lang.commentIgnore)) {
          ignore_this_block = 1;
        }
      }
      if (in_block || single) {
        if (in_block && line.match(lang.commentExit)) {
          line = line.replace(lang.commentExit, '');
          in_block = -1;
        }
        if (in_block > 1 && lang.commentNext) {
          line = line.replace(lang.commentNext, '');
        }
        if (lang.commentParam) {
          param = line.match(lang.commentParam);
          if (param) {
            line = line.replace(param[0], '\n' + '<b>' + param[1] + '</b>');
          }
        }
      }
      if (!ignore_this_block && (in_block || single)) {
        if (hasCode) {
          save();
        }
        docsText += line + '\n';
        if (/^(---+|===+)$/.test(line || in_block === -1)) {
          save();
        }
      } else {
        hasCode = true;
        codeText += line + '\n';
      }
      if (in_block === -1) {
        in_block = 0;
      }
      if (!in_block) {
        ignore_this_block = 0;
      }
    }
    save();
    return sections;
  };

  format = function(source, sections, config) {
    var code, i, language, section, _i, _len, _results;
    language = getLanguage(source, config);
    marked.setOptions({
      highlight: function(code, lang) {
        lang || (lang = language.name);
        if (highlightjs.getLanguage(lang)) {
          return highlightjs.highlight(lang, code).value;
        } else {
          console.warn("docco: couldn't highlight code block with unknown language '" + lang + "' in " + source);
          return code;
        }
      }
    });
    _results = [];
    for (i = _i = 0, _len = sections.length; _i < _len; i = ++_i) {
      section = sections[i];
      code = highlightjs.highlight(language.name, section.codeText).value;
      code = code.replace(/\s+$/, '');
      section.codeHtml = "<div class='highlight'><pre>" + code + "</pre></div>";
      _results.push(section.docsHtml = marked(section.docsText));
    }
    return _results;
  };

  write = function(source, title_idx, source_infos, config) {
    var css, destination, html, relative;
    destination = function(file) {
      return path.join(config.output, path.dirname(file), path.basename(file, path.extname(file)) + '.html');
    };
    relative = function(file) {
      var from, to;
      to = path.dirname(path.resolve(file));
      from = path.dirname(path.resolve(destination(source)));
      return path.join(path.relative(from, to), path.basename(file));
    };
    css = relative(path.join(config.output, path.basename(config.css)));
    html = config.template({
      sources: config.sources,
      titles: source_infos.map(function(info) {
        return info.title;
      }),
      css: css,
      title: source_infos[title_idx].title,
      hasTitle: source_infos[title_idx].hasTitle,
      sections: source_infos[title_idx].sections,
      path: path,
      destination: destination,
      relative: relative
    });
    console.log("docco: " + source + " -> " + (destination(source)));
    return fs.writeFileSync(destination(source), html);
  };

  outputCode = function(source, sections, config) {
    var code, destination, lang;
    lang = getLanguage(source, config);
    destination = function(file) {
      return path.join(config.source, path.basename(file, path.extname(file)) + lang.source);
    };
    if (config.source) {
      code = _.pluck(sections, 'codeText').join('\n');
      code = code.trim().replace(/(\n{2,})/g, '\n\n');
      console.log("docco: " + source + " -> " + (destination(source)));
      return fs.writeFileSync(destination(source), code);
    }
  };

  defaults = {
    layout: 'parallel',
    output: 'docs',
    template: null,
    css: null,
    extension: null,
    languages: {},
    source: null,
    blocks: false,
    markdown: false
  };

  configure = function(options) {
    var config, dir;
    config = _.extend({}, defaults, _.pick.apply(_, [options].concat(__slice.call(_.keys(defaults)))));
    config.languages = buildMatchers(config.languages);
    if (options.template) {
      config.layout = null;
    } else {
      dir = config.layout = path.join(__dirname, 'resources', config.layout);
      if (fs.existsSync(path.join(dir, 'public'))) {
        config["public"] = path.join(dir, 'public');
      }
      config.template = path.join(dir, 'docco.jst');
      config.css = options.css || path.join(dir, 'docco.css');
    }
    config.template = _.template(fs.readFileSync(config.template).toString());
    config.sources = options.args.filter(function(source) {
      var lang;
      lang = getLanguage(source, config);
      if (!lang) {
        console.warn("docco: skipped unknown type (" + (path.basename(source)) + ")");
      }
      return lang;
    }).sort();
    return config;
  };

  _ = require('underscore');

  fs = require('fs-extra');

  path = require('path');

  marked = require('marked');

  commander = require('commander');

  highlightjs = require('highlight.js');

  marked.setOptions({
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: true,
    langPrefix: 'language-',
    highlight: function(code, lang) {
      return code;
    }
  });

  languages = JSON.parse(fs.readFileSync(path.join(__dirname, 'resources', 'languages.json')));

  buildMatchers = function(languages) {
    var ext, l;
    for (ext in languages) {
      l = languages[ext];
      if (l.symbol) {
        l.commentMatcher = RegExp("^\\s*" + l.symbol + "\\s?");
      }
      if (l.enter && l.exit) {
        l.blocks = true;
        l.commentEnter = new RegExp(l.enter);
        l.commentExit = new RegExp(l.exit);
        if (l.next) {
          l.commentNext = new RegExp(l.next);
        }
      }
      if (l.param) {
        l.commentParam = new RegExp(l.param);
      }
      l.commentFilter = /(^#![/]|^\s*#\{)/;
      l.commentIgnore = new RegExp(/^:/);
    }
    return languages;
  };

  languages = buildMatchers(languages);

  getLanguage = function(source, config) {
    var codeExt, codeLang, ext, lang;
    ext = config.extension || path.extname(source) || path.basename(source);
    lang = config.languages[ext] || languages[ext] || languages['text'];
    if (lang) {
      if (lang.name === 'markdown') {
        codeExt = path.extname(path.basename(source, ext));
        if (codeExt && (codeLang = languages[codeExt])) {
          lang = _.extend({}, codeLang, {
            literate: true,
            source: ''
          });
        }
      } else if (!lang.source) {
        lang.source = ext;
      }
    }
    return lang;
  };

  version = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'))).version;

  run = function(args) {
    var c;
    if (args == null) {
      args = process.argv;
    }
    c = defaults;
    commander.version(version).usage('[options] files').option('-L, --languages [file]', 'use a custom languages.json', _.compose(JSON.parse, fs.readFileSync)).option('-l, --layout [name]', 'choose a layout (parallel, linear, pretty or classic)', c.layout).option('-o, --output [path]', 'output to a given folder', c.output).option('-c, --css [file]', 'use a custom css file', c.css).option('-t, --template [file]', 'use a custom .jst template', c.template).option('-b, --blocks', 'parse block comments where available', c.blocks).option('-m, --markdown', 'output markdown', c.markdown).option('-e, --extension [ext]', 'assume a file extension for all inputs', c.extension).option('-s, --source [path]', 'output code in a given folder', c.source).parse(args).name = "docco";
    if (commander.args.length) {
      return document(commander);
    } else {
      return console.log(commander.helpInformation());
    }
  };

  Docco = module.exports = {
    run: run,
    document: document,
    parse: parse,
    format: format,
    configure: configure,
    version: version
  };

}).call(this);
