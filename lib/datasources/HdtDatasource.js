/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An HdtDatasource loads and queries an HDT document in-process. */

var Datasource = require('./Datasource'),
    hdt = require('hdt'),
    ExternalHdtDatasource = require('./ExternalHdtDatasource');

// Creates a new HdtDatasource
function HdtDatasource(options) {
  if (!(this instanceof HdtDatasource))
    return new HdtDatasource(options);
  Datasource.call(this, options);

  options = options || {};
  // Switch to external HDT datasource if the `external` flag is set
  if (options.external)
    return new ExternalHdtDatasource(options);
  this._hdtFile = (options.file || '').replace(/^file:\/\//, '');
}
Datasource.extend(HdtDatasource, ['triplePattern', 'limit', 'offset', 'totalCount']);

// Loads the HDT datasource
HdtDatasource.prototype._initialize = function (done) {
  var datasource = this;
  hdt.fromFile(this._hdtFile).then(function (hdtDocument) {
    datasource._hdtDocument = hdtDocument;
  }).then(done, done);
};

// Writes the results of the query to the given triple stream
HdtDatasource.prototype._executeQuery = function (query, destination) {
  this._hdtDocument.searchTriples(query.subject, query.predicate, query.object,
                                  { limit: query.limit, offset: query.offset })
    .then(function (result) {
      var triples = result.triples,
          estimatedTotalCount = result.totalCount,
          distinctSubjects = result.distinctSubjects,
          distinctPredicates = result.distinctPredicates,
          distinctObjects = result.distinctObjects, 
          hasExactCount = result.hasExactCount;
      // Ensure the estimated total count is as least as large as the number of triples
      var tripleCount = triples.length, offset = query.offset || 0;
      if (tripleCount && estimatedTotalCount < offset + tripleCount)
        estimatedTotalCount = offset + (tripleCount < query.limit ? tripleCount : 2 * tripleCount);
      destination.setProperty('metadata', { totalCount: estimatedTotalCount, hasExactCount: hasExactCount, distinctSubjects: distinctSubjects, distinctPredicates: distinctPredicates, distinctObjects: distinctObjects });
      // Add the triples to the output
      for (var i = 0; i < tripleCount; i++)
        destination._push(triples[i]);
      destination.close();
    },
    function (error) { destination.emit('error', error); });
};

// Closes the data source
HdtDatasource.prototype.close = function (done) {
  // Close the HDT document if it is open
  if (this._hdtDocument) {
    this._hdtDocument.close().then(done, done);
    delete this._hdtDocument;
  }
  // If initialization was still pending, close immediately after initializing
  else if (!this.initialized)
    this.on('initialized', this.close.bind(this, done));
};

module.exports = HdtDatasource;
