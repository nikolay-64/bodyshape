const gulp = require('gulp');

// Tasks
require('./gulp/dev.js');
require('./gulp/docs.js');
require('./gulp/fontsDev.js');
require('./gulp/fontsDocs.js');

gulp.task(
	'default',
	gulp.series(
		'clean:dev', 'fontsDev',
		gulp.parallel('pug:dev','sass:dev', 'images:dev', gulp.series('svgStack:dev', 'svgSymbol:dev'), 'libs:dev', 'files:dev', 'js:dev'),
		gulp.parallel('html:prettify'),
		gulp.parallel('server:dev', 'watch:dev')
	)
);

gulp.task(
	'docs',
	gulp.series(
		'clean:docs', 'fontsDocs',
		gulp.parallel( 'pug:docs', 'sass:docs', 'images:docs', gulp.series('svgStack:docs', 'svgSymbol:docs'), 'libs:docs', 'files:docs', 'js:docs'),
		gulp.parallel('html:prettify'),
		gulp.parallel('server:docs')
	)
);