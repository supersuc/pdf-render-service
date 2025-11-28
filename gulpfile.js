"use strict";

const gulp = require("gulp");
const sass = require("gulp-sass")(require("sass"));
const { watch, series } = require("gulp");

function buildStyles() {
  return gulp
    .src("./assets/styles/**/*.scss")
    .pipe(sass().on("error", sass.logError))
    .pipe(gulp.dest("./public/css"));
}

exports.watch = function () {
  watch("./assets/styles/**/*.scss", series(buildStyles));
};
