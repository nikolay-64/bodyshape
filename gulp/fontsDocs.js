const plumber = require('gulp-plumber');
const notify = require('gulp-notify');

const fs = require('fs');
const gulp = require('gulp');
const fonter = require('gulp-fonter-fix');
const ttf2woff2 = require('gulp-ttf2woff2');

const srcFolder = './src';
const destFolder = './docs';

gulp.task('otfToTtf', () => {
	// Ищем файлы шрифтов .otf
	return (
		gulp
			.src(`${srcFolder}/fonts/**/*.otf`, {})
			// Конвертируем в .ttf
			.pipe(
				fonter({
					formats: ['ttf'],
				})
			)
			// Выгружаем в исходную папку
			.pipe(gulp.dest(`${srcFolder}/fonts/`))
			.pipe(
				plumber(
					notify.onError({
						title: 'FONTS',
						message:
							'Error: <%= error.message %>. File: <%= file.relative %>!',
					})
				)
			)
	);
});

gulp.task('ttfToWoff', () => {
	// Ищем файлы шрифтов .ttf
	return (
		gulp
			.src(`${srcFolder}/fonts/**/*.ttf`, {})
			// Конвертируем в .woff
			.pipe(
				fonter({
					formats: ['woff'],
				})
			)
			// Выгружаем в папку с результатом
			.pipe(gulp.dest(`${destFolder}/fonts/`))
			// Ищем файлы шрифтов .ttf
			.pipe(gulp.src(`${srcFolder}/fonts/**/*.ttf`))
			// Конвертируем в .woff2
			.pipe(ttf2woff2())
			// Выгружаем в папку с результатом
			.pipe(gulp.dest(`${destFolder}/fonts/`))
			.pipe(
				plumber(
					notify.onError({
						title: 'FONTS',
						message: 'Error: <%= error.message %>',
					})
				)
			)
	);
});

// Функция, чтобы два раза не повторятся при создании шрифтов в папке и без папки
function createFontFile(fontsFile, fontFileName, fontPath, cb) {
	let fontName = fontFileName.split('-')[0]
		? fontFileName.split('-')[0]
		: fontFileName;
	// заметил, что если у шрифта в названии есть italiс, bold и т.д. то стили генерирются неккоретно, теперь будет сравниваться только название второй части название шрифты через тире (Blackcraft-BlackItalic.ttf)
	let fontNameOtherPart = fontFileName.split('-')[1]
		? fontFileName.split('-')[1]
		: 'regular normal';

	let fontWeight = 400; // по-умолчанию
	let fontStyle = 'normal'; // по-умолчанию

	// если шрифт вариативный
	let isFontVariable = fontFileName.toLowerCase().includes('variablefont') || fontFileName.toLowerCase().includes('vf');

	// проверка на начертания
	if (fontNameOtherPart.toLowerCase().includes('thin')) {
		fontWeight = 100;
	} else if (fontNameOtherPart.toLowerCase().includes('extralight')) {
		fontWeight = 200;
	} else if (fontNameOtherPart.toLowerCase().includes('light')) {
		fontWeight = 300;
	} else if (fontNameOtherPart.toLowerCase().includes('medium')) {
		fontWeight = 500;
	} else if (fontNameOtherPart.toLowerCase().includes('semibold')) {
		fontWeight = 600;
	} else if (fontNameOtherPart.toLowerCase().includes('bold') && !fontNameOtherPart.toLowerCase().includes('extrabold')) {
		fontWeight = 700;
	} else if (
		fontNameOtherPart.toLowerCase().includes('extrabold') ||
		fontNameOtherPart.toLowerCase().includes('heavy')
	) {
		fontWeight = 800;
	} else if (fontNameOtherPart.toLowerCase().includes('black')) {
		fontWeight = 900;
	}

	// проверка на стиль
	if (fontNameOtherPart.toLowerCase().includes('italic')) {
		fontStyle = 'italic'
	} else if (fontNameOtherPart.toLowerCase().includes('oblique')) {
		fontStyle = 'oblique';
	}

	let cssProperty = `@font-face {\n\tfont-family: ${fontName};\n\tfont-display: swap;\n\tsrc: url("../fonts/${fontPath}.woff2") format("woff2"), url("../fonts/${fontPath}.woff") format("woff");\n\tfont-weight: ${fontWeight};\n\tfont-style: ${fontStyle};\n}\r\n`;

	if (isFontVariable) {
		// если шрифт вариативный то добавляет к названию суффикс "-VF" + к формату добавляется суффикс "-variations" + убирается font-weight и font-style
		cssProperty = `@font-face {\n\tfont-family: ${fontName}-VF;\n\tfont-display: swap;\n\tsrc: url("../fonts/${fontPath}.woff2") format("woff2-variations"), url("../fonts/${fontPath}.woff") format("woff-variations");\n}\r\n`

	}

	fs.appendFile(
		fontsFile,
		cssProperty,
		cb
	);
}

gulp.task('fontsStyle', () => {
	// Файл стилей подключения шрифтов
	let fontsFile = `${srcFolder}/scss/base/_fontsAutoGen.scss`;
	// Проверяем существуют ли файлы шрифтов
	fs.readdir(`${destFolder}/fonts/`, function (err, fontsFiles) {
		if (fontsFiles) {
			// Проверяем существует ли файл стилей для подключения шрифтов
			// Если файла нет, создаем его
			fs.writeFile(fontsFile, '', cb);
			let newFileOnly;
			for (let i = 0; i < fontsFiles.length; i++) {
				// Записываем подключения шрифтов в файл стилей
				let fontFileName = fontsFiles[i].split('.')[0];

				// папка или файл есть и не начинается с точки (был баг с .DS_Store)
				if (fontFileName) {
					// Проверка на то, это файл или папка
					let folder = !fontsFiles[i].includes('.') ? fontsFiles[i] : false;
					// Для названия пути
					let fontPath = fontFileName;

					// Если нет вложенных папок
					if (!folder) {
						if (newFileOnly !== fontFileName) {
							createFontFile(fontsFile, fontFileName, fontPath, cb);
							newFileOnly = fontFileName;
						}
					}
					// Если вложенные папки есть то, заходим в папку и находим все файлы в ней
					if (folder) {
						fs.readdir(`${srcFolder}/fonts/${fontPath}`, function (err, fontsFiles) {
							if (fontsFiles) {
								let newFileOnly;

								for (let i = 0; i < fontsFiles.length; i++) {
									// Записываем подключения шрифтов в файл стилей
									let fontFileName = fontsFiles[i].split('.')[0];

									// папка или файл есть и не начинается с точки (был баг с .DS_Store)
									if (fontFileName) {
										fontPath = folder + '/' + fontFileName;

										if (newFileOnly !== fontFileName) {
											createFontFile(fontsFile, fontFileName, fontPath, cb);
											newFileOnly = fontFileName;
										}
									}
								}
							}
						})
					}


				}

			}

		}
	});

	return gulp.src(`${srcFolder}`);
	function cb() {}
});

gulp.task('fontsDocs', gulp.series('otfToTtf', 'ttfToWoff', 'fontsStyle'));
