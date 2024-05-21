# Change Log

## [0.4.9] - 2024-05-21

### Changed
- Add support for Mustache Templating strings.
- New Setup AMPscript option which allows to set Mustach Templating tags used.
- Refactors.

### Fixed
- Broken formatting on Output/Print AMPscript (the %%==%% syntax).

## [0.4.7] - 2024-04-25

### Changed
- Bundled the module.
- Changed prettier to v3, but switched to standalone version due to issues with webpack and jest.

## [0.4.6] - 2024-02-06
### Fixed
- Formatting getting broken by variables, strings, etc. that collided with keywords. E.g.: `SET @myNextVar = "my set variable".

### Changed
- All variables are now "cased" (upper/lower case) based on the first occurrence.
- Refactors, bug fixes, improved docs, more unit tests.

## [0.4.5] - 2023-12-07

### Changed
- new parameter on beautify to switch off HTML formatting (useful if HTML is broken)

## [0.4.4] - 2023-12-07

### Changed
- multiline comments improved,
- standalone methods are now formatted as methods, and not merged with keyword,
- new option to use a `.beautyamp.json` file for the setup,
- logger defaults to OFF,
- test cases added.

## [0.4.0] - 2023-12-03

### Changed
- changed beautify() to async

### Added
- Prettier formatting for HTML.

## [0.3.8] - 2023-11-10

- Small tweaks.