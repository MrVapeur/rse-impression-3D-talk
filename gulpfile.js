'use strict';

/** Imports Gulp */
const gulp = require('gulp');
const del = require('del');
const path = require('path');
const fs = require('fs');
const browserSync = require('browser-sync').create();
var exec = require('gulp-exec');
const through = require('through2');

/** Imports Reveal */
const map = require('map-stream');
var asciidoctor = require('@asciidoctor/core')()
var asciidoctorRevealjs = require('@asciidoctor/reveal.js')
asciidoctorRevealjs.register();

/**
 * Import SASS
 */
const sass = require('sass')

/** Définition des constantes */

// Dossier des sources à builder
const srcDir = 'slides';
// Dossier de sortie du build
let outDir = 'public';
// Dossier racine des presentations au runtime (=path d'accès dans l'url. ex: http://..../prez)
let runtimePrezDir = '/dedramatisons-accessibilite';
let cdn = 'https://cdnjs.cloudflare.com/ajax/libs/reveal.js/3.9.2';
// Dossier de sortie du build des présentations
let prezOutDir = `${outDir}`;

// Constantes des extensions à prendre en compte pour les différents items du build
const adocIndexFiles = [`${srcDir}/**/index.adoc`, `${srcDir}/**/index-*.adoc`];
const adocWatchExtensions = [`${srcDir}/**/*.adoc`];
const mediasExtensions = [`${srcDir}/**/*.{svg,png,jpg,gif,webp}`];
const mermaidWatchExtensions = [`${srcDir}/**/*.mmd`];
const cssExtensions = [`${srcDir}/**/*.css`];
const jsExtensions = [`${srcDir}/**/*.js`];
const themesExtensions = [`themes/**/*.{svg,png,jpg,woff2,ttf,css}`];
const sassExtensions = [`themes/**/*.scss`];
const pagesExtensions = [`pages/**/*.*`];
const extReplace = require('gulp-ext-replace');

gulp.task('convert', () =>
    gulp.src(adocIndexFiles)
        .pipe(convertAdocToHtml())
        .pipe(extReplace('.html'))
        .pipe(gulp.dest(prezOutDir))


);

gulp.task('copy-and-generate-mermaid-png', () =>
  gulp.src(mermaidWatchExtensions)
    .pipe(gulp.dest(prezOutDir))
    .pipe(exec('mmdc -i <%= file.path %> -o <%= file.path.replace("mmd", options.ext) %>', { ext: 'png' }))
);

gulp.task('dependencies', (done) => {
      gulp.src('node_modules/reveal.js/{css,js,lib,plugin}/**/*.*')
          .pipe(gulp.dest(`${prezOutDir}/node_modules/reveal.js`));
      gulp.src('node_modules/font-awesome/{css,fonts}/*.*')
          .pipe(gulp.dest(`${prezOutDir}/../themes/font-awesome`));
      done();
});



gulp.task('copy-medias', () =>
  gulp.src(mediasExtensions).pipe(gulp.dest(prezOutDir))
);

gulp.task('copy-css', () =>
  gulp.src(cssExtensions).pipe(gulp.dest(prezOutDir))
);

gulp.task('copy-js', () =>
  gulp.src(jsExtensions).pipe(gulp.dest(prezOutDir))
);

// a custom pipeable step to transform Sass to CSS
function compileSass() {
    return through.obj( ( vinylFile, encoding, callback ) => {
        const transformedFile = vinylFile.clone();

        sass.render({
            data: transformedFile.contents.toString(),
            file: transformedFile.path,
        }, ( err, result ) => {
            if( err ) {
                callback(err);
            }
            else {
                transformedFile.extname = '.css';
                transformedFile.contents = result.css;
                callback( null, transformedFile );
            }
        });
    });
}

gulp.task('copy-scss', () =>
    gulp.src('themes/**/styles.scss')
        .pipe(compileSass())
        .pipe(gulp.dest(`${outDir}/themes/`))
);
gulp.task('copy-themes', () =>
    gulp.src(themesExtensions).pipe(gulp.dest(`${outDir}/themes/`))
);

gulp.task('copy-pages', () =>
    gulp.src(pagesExtensions).pipe(gulp.dest(`${outDir}/`))
);

gulp.task('serveAndWatch', () => {
    browserSync.init({
        server: {
          baseDir: `./${outDir}/`
        },
        directory: true,
        notify: false,
        port: 3000
    });

    function browserSyncReload(cb) {
        browserSync.reload();
        cb();
    }

    gulp.watch(adocWatchExtensions, gulp.series('convert', browserSyncReload));
    gulp.watch(mediasExtensions, gulp.series('copy-medias', browserSyncReload));
    gulp.watch(cssExtensions, gulp.series('copy-css', browserSyncReload));
    gulp.watch(sassExtensions, gulp.series('copy-scss', browserSyncReload));
    gulp.watch(themesExtensions, gulp.series('copy-themes', browserSyncReload));
    gulp.watch(jsExtensions, gulp.series('copy-js', browserSyncReload));
    gulp.watch(mermaidWatchExtensions, gulp.series('copy-and-generate-mermaid-png', browserSyncReload));
});


gulp.task('clean', () => del(outDir, { dot: true }));


// Build production files, the default task
gulp.task('default', gulp.series(
        'clean',
        'convert',
        gulp.parallel('dependencies', 'copy-css', 'copy-js', 'copy-medias', 'copy-scss','copy-themes', 'copy-pages', 'copy-and-generate-mermaid-png')
    )
);


gulp.task('prepare', prepare);

function prepare(cb) {
    outDir = 'dist'
    prezOutDir = `${outDir}`
    runtimePrezDir = ''
    cdn = '/node_modules/reveal.js';
    cb();
}

// Build dev files
gulp.task('serve', gulp.series(
    'prepare',
    'default',
    'serveAndWatch')
);

function convertAdocToHtml() {

  const attributes = {
      'revealjsdir': `${cdn}@`,
      'runtimePrezDir': `${runtimePrezDir}`
  };
  const options = {
    safe: 'safe',
    backend: 'revealjs',
    attributes: attributes,
    to_file: false,
    header_footer: true
  };

  return map((file, next) => {
    console.log(`Compilation en html de ${file.path}`);
    const newContent = asciidoctor.convertFile(file.path, options);
    file.contents = new Buffer(newContent);
    next(null, file);
  });
};
