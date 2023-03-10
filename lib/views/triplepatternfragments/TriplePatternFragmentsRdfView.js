/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* A TriplePatternFragmentsRdfView represents a Triple Pattern Fragment in RDF. */

var RdfView = require('../RdfView');

var dcTerms = 'http://purl.org/dc/terms/',
    rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    xsd = 'http://www.w3.org/2001/XMLSchema#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    voID = 'http://rdfs.org/ns/void#';

// Creates a new TriplePatternFragmentsRdfView
function TriplePatternFragmentsRdfView(settings) {
  if (!(this instanceof TriplePatternFragmentsRdfView))
    return new TriplePatternFragmentsRdfView(settings);
  RdfView.call(this, 'TriplePatternFragments', settings);
}
RdfView.extend(TriplePatternFragmentsRdfView);

// Generates triples and quads by sending them to the data and/or metadata callbacks
TriplePatternFragmentsRdfView.prototype._generateRdf = function (settings, data, metadata, done) {
  var datasource = settings.datasource, fragment = settings.fragment, query = settings.query,
      results = settings.results, metadataDone = false;

  // Add data source metadata
  metadata(datasource.index, hydra + 'member', datasource.url);
  metadata(datasource.url, rdf + 'type', voID  + 'Dataset');
  metadata(datasource.url, rdf + 'type', hydra + 'Collection');
  metadata(datasource.url, voID + 'subset', fragment.pageUrl);
  if (fragment.url !== fragment.pageUrl)
    metadata(datasource.url, voID + 'subset', fragment.url);

  // Add data source controls
  metadata(datasource.url, hydra + 'search', '_:triplePattern');
  metadata('_:triplePattern', hydra + 'template', '"' + datasource.templateUrl + '"');
  metadata('_:triplePattern', hydra + 'variableRepresentation', hydra + 'ExplicitRepresentation');
  metadata('_:triplePattern', hydra + 'mapping', '_:subject');
  metadata('_:triplePattern', hydra + 'mapping', '_:predicate');
  metadata('_:triplePattern', hydra + 'mapping', '_:object');
  metadata('_:subject',   hydra + 'variable',      '"subject"');
  metadata('_:subject',   hydra + 'property', rdf + 'subject');
  metadata('_:predicate', hydra + 'variable',      '"predicate"');
  metadata('_:predicate', hydra + 'property', rdf + 'predicate');
  metadata('_:object',    hydra + 'variable',      '"object"');
  metadata('_:object',    hydra + 'property', rdf + 'object');

  // Add fragment metadata
  results.getProperty('metadata', function (meta) {
    // General fragment metadata
    metadata(fragment.url, voID + 'subset', fragment.pageUrl);
    metadata(fragment.pageUrl, rdf + 'type', hydra + 'PartialCollectionView');
    metadata(fragment.pageUrl, dcTerms + 'title',
                '"Linked Data Fragment of ' + (datasource.title || '') + '"@en');
    metadata(fragment.pageUrl, dcTerms + 'description',
                '"Triple Pattern Fragment of the \'' + (datasource.title || '') + '\' dataset ' +
                'containing triples matching the pattern ' + query.patternString + '."@en');
    metadata(fragment.pageUrl, dcTerms + 'source',   datasource.url);

    // Total pattern matches count
    var totalCount = meta.totalCount;
    var distinctSubjects = meta.distinctSubjects;
    var distinctProperties = meta.distinctPredicates;
    var distinctObjects = meta.distinctObjects;

    metadata(fragment.pageUrl, hydra + 'totalItems', '"' + totalCount + '"^^' + xsd + 'integer');
    metadata(fragment.pageUrl, voID  + 'triples',    '"' + totalCount + '"^^' + xsd + 'integer');
    metadata(fragment.pageUrl, voID  + 'distinctSubjects',    '"' + distinctSubjects + '"^^' + xsd + 'integer');
    metadata(fragment.pageUrl, voID  + 'properties',    '"' + distinctProperties + '"^^' + xsd + 'integer');
    metadata(fragment.pageUrl, voID  + 'distinctObjects',    '"' + distinctObjects + '"^^' + xsd + 'integer');
    // Page metadata
    metadata(fragment.pageUrl, hydra + 'itemsPerPage', '"' + query.limit + '"^^' + xsd + 'integer');
    metadata(fragment.pageUrl, hydra + 'first', fragment.firstPageUrl);
    if (query.offset)
      metadata(fragment.pageUrl, hydra + 'previous', fragment.previousPageUrl);
    if (totalCount >= query.limit + (query.offset || 0))
      metadata(fragment.pageUrl, hydra + 'next', fragment.nextPageUrl);

    // End if the data was also written
    metadataDone = true;
    results.ended && done();
  });

  // Add fragment data
  results.on('data', data);
  results.on('end', function () { metadataDone && done(); });
};

module.exports = TriplePatternFragmentsRdfView;
