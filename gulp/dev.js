const gulp = require('gulp');
const pug = require('gulp-pug');
const sass = require('gulp-sass')(require('sass'));
const sassGlob = require('gulp-sass-glob');
const server = require('gulp-server-livereload');
const clean = require('gulp-clean');
const fs = require('fs');
const sourceMaps = require('gulp-sourcemaps');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const webpack = require('webpack-stream');
const babel = require('gulp-babel');
const imagemin = require('gulp-imagemin');
const changed = require('gulp-changed');
const changedInPlace = require('gulp-changed-in-place');
const typograf = require('gulp-typograf');
const svgsprite = require('gulp-svg-sprite');
const replace = require('gulp-replace');
const webpHTML = require('gulp-webp-retina-html');
const imageminWebp = require('imagemin-webp');
const rename = require('gulp-rename');
const prettier = require('@bdchauvette/gulp-prettier');
const formatHtml = require('gulp-format-html');

gulp.task('clean:dev', function(done) {
	if (fs.existsSync('./build/')) {
		return gulp
			.src('./build/', { read: false })
			.pipe(clean({ force: true }));
	}
	done();
});

// инлайн теги с новой строки в html
gulp.task('html:prettify', function() {
	return gulp
	.src('build/**/*.html')
	.pipe(formatHtml())
	.pipe(gulp.dest('./build/'));
});

const pugSetting = {
	pretty: true,
	verbose: true,
};

const plumberNotify = (title) => {
	return {
		errorHandler: notify.onError({
			title: title,
			message: 'Error <%= error.message %>',
			sound: false,
		}),
	};
};

gulp.task('pug:dev', function() {
	return gulp
		.src(['./src/pug/pages/**/*.pug', '!./src/pug/pages/**/docs.pug'])
		.pipe(pug(pugSetting))
		.pipe(
			replace(/<img(?:.|\n|\r)*?>/g, function(match) {
				return match.replace(/\r?\n|\r/g, '').replace(/\s{2,}/g, ' ');
			})
		) //удаляет лишние пробелы и переводы строк внутри тега <img>
		.pipe(
			replace(
				/(?<=src=|href=|srcset=)(['"])(\.(\.)?\/)*(img|images|fonts|css|scss|sass|js|files|audio|video)(\/[^\/'"]+(\/))?([^'"]*)\1/gi,
				'$1./$4$5$7$1'
			)
		)
		.pipe(
			typograf({
				locale: ['ru', 'en-US'],
				htmlEntity: { type: 'digit' },
				disableRule: [
					'common/punctuation/quote',
					'ru/other/phone-number',
				],
				safeTags: [
					['<\\?php', '\\?>'],
					['<no-typography>', '</no-typography>'],
				],
			})
		)
		.pipe(replace('&#171;', '«'))
		.pipe(replace('&#187;', '»'))
		.pipe(replace('&#8211;', '–'))
		.pipe(
			webpHTML({
				extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
				retina: {
					1: '',
					2: '@2x',
				},
			})
		)
		.pipe(changedInPlace({ firstPass: true }))
		.pipe(
			prettier({
				tabWidth: 4,
				useTabs: true,
				printWidth: 132,
				trailingComma: 'es5',
				bracketSpacing: false,
				semi: true,
			})
		)
		.pipe(gulp.dest('./build/'))
		.pipe(plumber(plumberNotify('PUG')));
});

gulp.task('sass:dev', function() {
	return gulp
		.src('./src/scss/*.scss')
		.pipe(changed('./build/css/'))
		.pipe(plumber(plumberNotify('SCSS')))
		.pipe(sourceMaps.init())
		.pipe(sassGlob())
		.pipe(sass())
		.pipe(
			replace(
				/(['"]?)(\.\.\/)+(img|images|fonts|css|scss|sass|js|files|audio|video)(\/[^\/'"]+(\/))?([^'"]*)\1/gi,
				'$1$2$3$4$6$1'
			)
		)
		.pipe(sourceMaps.write())
		.pipe(gulp.dest('./build/css/'));
});

gulp.task('images:dev', function() {
	return (
		gulp
			.src(['./src/img/**/*', '!./src/img/svgicons/**/*'])
			.pipe(changed('./build/img/'))
			.pipe(
				imagemin([
					imageminWebp({
						quality: 85,
					}),
				])
			)
			.pipe(rename({ extname: '.webp' }))
			.pipe(gulp.dest('./build/img/'))
			.pipe(gulp.src(['./src/img/**/*', '!./src/img/svgicons/**/*']))
			.pipe(changed('./build/img/'))
			// .pipe(imagemin({ verbose: true }))
			.pipe(gulp.dest('./build/img/'))
	);
});

const svgStack = {
	mode: {
		stack: {
			example: true,
		},
	},
	shape: {
		transform: [
			{
				svgo: {
					js2svg: { indent: 4, pretty: true },
				},
			},
		],
	},
};

const svgSymbol = {
	mode: {
		symbol: {
			sprite: '../sprite.symbol.svg',
		},
	},
	shape: {
		transform: [
			{
				svgo: {
					js2svg: { indent: 4, pretty: true },
					plugins: [
						{
							name: 'removeAttrs',
							params: {
								attrs: '(fill|stroke)',
							},
						},
					],
				},
			},
		],
	},
};

gulp.task('svgStack:dev', function() {
	return gulp
		.src('./src/img/svgicons/**/*.svg')
		.pipe(plumber(plumberNotify('SVG:dev')))
		.pipe(svgsprite(svgStack))
		.pipe(gulp.dest('./build/img/svgsprite/'));
});

gulp.task('svgSymbol:dev', function() {
	return gulp
		.src('./src/img/svgicons/**/*.svg')
		.pipe(plumber(plumberNotify('SVG:dev')))
		.pipe(svgsprite(svgSymbol))
		.pipe(gulp.dest('./build/img/svgsprite/'));
});

gulp.task('libs:dev', function() {
	return gulp
		.src('./src/libs/**/*')
		.pipe(changed('./build/libs/'))
		.pipe(gulp.dest('./build/libs/'));
});

gulp.task('files:dev', function() {
	return gulp
		.src('./src/files/**/*')
		.pipe(changed('./build/files/'))
		.pipe(gulp.dest('./build/files/'));
});

gulp.task('js:dev', function() {
	return (
		gulp
			.src('./src/js/*.js')
			.pipe(changed('./build/js/'))
			.pipe(plumber(plumberNotify('JS')))
			// .pipe(babel())
			.pipe(webpack(require('./../webpack.config.js')))
			.pipe(gulp.dest('./build/js/'))
	);
});

const serverOptions = {
	livereload: true,
	open: true,
};

gulp.task('server:dev', function() {
	return gulp.src('./build/').pipe(server(serverOptions));
});

gulp.task('watch:dev', function() {
	gulp.watch('./src/scss/**/*.scss', gulp.parallel('sass:dev'));
	gulp.watch(
		['./src/pug/**/*.pug', './src/html/**/*.json'],
		gulp.parallel('pug:dev')
	);
	gulp.watch('./src/img/**/*', gulp.parallel('images:dev'));
	gulp.watch('./src/libs/**/*', gulp.parallel('libs:dev'));
	gulp.watch('./src/files/**/*', gulp.parallel('files:dev'));
	gulp.watch('./src/js/**/*.js', gulp.parallel('js:dev'));
	gulp.watch(
		'./src/img/svgicons/*',
		gulp.series('svgStack:dev', 'svgSymbol:dev')
	);
});
