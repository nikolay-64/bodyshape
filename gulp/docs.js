const gulp = require('gulp');
const replace = require('gulp-replace');

// HTML
const pug = require('gulp-pug');
const htmlclean = require('gulp-htmlclean');
const webpHTML = require('gulp-webp-retina-html');
const typograf = require('gulp-typograf');

// SASS
const sass = require('gulp-sass')(require('sass'));
const sassGlob = require('gulp-sass-glob');
const autoprefixer = require('gulp-autoprefixer');
const csso = require('gulp-csso');
// const webImagesCSS = require('gulp-web-images-css');  //Вывод WEBP-изображений

const server = require('gulp-server-livereload');
const clean = require('gulp-clean');
const fs = require('fs');
const sourceMaps = require('gulp-sourcemaps');
const groupMedia = require('gulp-group-css-media-queries');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const webpack = require('webpack-stream');
const babel = require('gulp-babel');
const changed = require('gulp-changed');
const changedInPlace = require("gulp-changed-in-place");

// Images
const imagemin = require('gulp-imagemin');
const imageminWebp = require('imagemin-webp');
const rename = require('gulp-rename');

// SVG
const svgsprite = require('gulp-svg-sprite');

const prettier = require('@bdchauvette/gulp-prettier');
const formatHtml = require('gulp-format-html');

gulp.task('clean:docs', function (done) {
	if (fs.existsSync('./docs/')) {
		return gulp
			.src('./docs/', { read: false })
			.pipe(clean({ force: true }));
	}
	done();
});

// инлайн теги с новой строки в html
gulp.task('html:prettify', function() {
	return gulp
	.src('docs/**/*.html')
	.pipe(formatHtml())
	.pipe(gulp.dest('./docs/'));
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

gulp.task('pug:docs', function() {
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
		.pipe(htmlclean())
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
		.pipe(gulp.dest('./docs/'))
		.pipe(plumber(plumberNotify('PUG')));
});

gulp.task('sass:docs', function () {
	return (
		gulp
			.src('./src/scss/*.scss')
			.pipe(changed('./docs/css/'))
			.pipe(plumber(plumberNotify('SCSS')))
			.pipe(sourceMaps.init())
			.pipe(sassGlob()) /* Первый */
			.pipe(sass()) /* Второй */
			.pipe(autoprefixer()) /* После SASS обработка CSS */
			.pipe(groupMedia())
			// .pipe(
			// 	webImagesCSS({
			// 		mode: 'webp',
			// 	})
			// )
			.pipe(
				replace(
					/(['"]?)(\.\.\/)+(img|images|fonts|css|scss|sass|js|files|audio|video)(\/[^\/'"]+(\/))?([^'"]*)\1/gi,
					'$1$2$3$4$6$1'
				)
			)
			.pipe(csso())
			.pipe(sourceMaps.write())
			.pipe(gulp.dest('./docs/css/'))
	);
});

gulp.task('images:docs', function () {
	return (
		gulp
			.src(['./src/img/**/*', '!./src/img/svgicons/**/*'])
			.pipe(changed('./docs/img/'))
			.pipe(
				imagemin([
					imageminWebp({
						quality: 85,
					}),
				])
			)
			.pipe(rename({ extname: '.webp' }))
			.pipe(gulp.dest('./docs/img/'))
			.pipe(gulp.src('./src/img/**/*'))
			.pipe(changed('./docs/img/'))
			.pipe(
				imagemin(
					[
						imagemin.gifsicle({ interlaced: true }),
						imagemin.mozjpeg({ quality: 85, progressive: true }),
						imagemin.optipng({ optimizationLevel: 5 }),
					],
					{ verbose: true }
				)
			)
			.pipe(gulp.dest('./docs/img/'))
	);
});

const svgStack = {
	mode: {
		stack: {
			example: true,
		},
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

gulp.task('svgStack:docs', function () {
	return gulp
		.src('./src/img/svgicons/**/*.svg')
		.pipe(plumber(plumberNotify('SVG:dev')))
		.pipe(svgsprite(svgStack))
		.pipe(gulp.dest('./docs/img/svgsprite/'));
});

gulp.task('svgSymbol:docs', function () {
	return gulp
		.src('./src/img/svgicons/**/*.svg')
		.pipe(plumber(plumberNotify('SVG:dev')))
		.pipe(svgsprite(svgSymbol))
		.pipe(gulp.dest('./docs/img/svgsprite/'));
});

gulp.task('libs:docs', function() {
	return gulp
		.src('./src/libs/**/*')
		.pipe(changed('./docs/libs/'))
		.pipe(gulp.dest('./docs/libs/'));
});

gulp.task('files:docs', function () {
	return gulp
		.src('./src/files/**/*')
		.pipe(changed('./docs/files/'))
		.pipe(gulp.dest('./docs/files/'));
});

gulp.task('js:docs', function () {
	return gulp
		.src('./src/js/*.js')
		.pipe(changed('./docs/js/'))
		.pipe(plumber(plumberNotify('JS')))
		.pipe(babel())
		.pipe(webpack(require('./../webpack.config.js')))
		.pipe(gulp.dest('./docs/js/'));
});

const serverOptions = {
	livereload: true,
	open: true,
};

gulp.task('server:docs', function () {
	return gulp.src('./docs/').pipe(server(serverOptions));
});
