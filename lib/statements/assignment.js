var CaliperDigitalResourceType = require('caliperjs/src/entities/digitalResourceType');
var CaliperEntityType = require('caliperjs/src/entities/entityType');
var CaliperEventType = require('caliperjs/src/events/eventType');

var ACTIVITY_TYPES = require('../activitytypes');
var StatementUtil = require('../util');
var VERBS = require('../verbs');

/**
 * Generate and store a learning activity statement for a user creating a new assignment
 *
 * @param  {Object}         config                                  @see config
 * @param  {Object}         statement                               @see statement
 * @param  {String}         statement.metadata.id                   The URL of the assignment
 * @param  {String}         statement.metadata.title                The title of the assignment
 * @param  {String}         [statement.metadata.description]        The description of the assignment
 * @param  {Date}           [statement.metadata.due_at]             The due date of the assignment
 * @param  {Number}         [statement.metadata.max_points]         The maximum number of points for the assignment
 * @param  {String[]}       [statement.metadata.submission_types]   The accepted submission types for the assignment
 * @param  {Function}       [callback]                              @see callback
 */
var create = module.exports.create = function(config, statement, callback) {
  // Input validation
  var validationError = StatementUtil.validate(config, statement, {
    'id': {
      'type': 'uri',
      'required': true
    },
    'title': {
      'type': 'string',
      'required': true
    },
    'description': {
      'type': 'string',
      'required': false
    },
    'due_at': {
      'type': 'date',
      'required': false
    },
    'max_points': {
      'type': 'number',
      'required': false
    },
    'submission_types': {
      'type': 'array',
      'required': false
    }
  });
  if (validationError) {
    return callback(validationError);
  }

  StatementUtil.processStatement(config, statement, {
    'verb': VERBS.CREATED,
    'XAPI': {
      'uuid': [statement.metadata.id],
      'object': {
        'id': statement.metadata.id,
        'type': ACTIVITY_TYPES.ASSESSMENT.id,
        'name': statement.metadata.title,
        'description': statement.metadata.description,
        'https://canvas.instructure.com/xapi/assignments/submissions_types': statement.metadata.submission_types
      }
    },
    'CALIPER': {
      'type': CaliperEventType.ASSESSMENT,
      'object': StatementUtil.Caliper.generateEntity({
        'type': CaliperDigitalResourceType.ASSIGNABLE_DIGITAL_RESOURCE,
        'id': statement.metadata.id,
        'name': statement.metadata.title,
        'description': statement.metadata.description,
        'dateToSubmit': statement.metadata.due_at,
        'maxScore': statement.metadata.max_points
      }, {
        'https://canvas.instructure.com/xapi/assignments/submissions_types': statement.metadata.submission_types
      })
    }
  }, callback);
};

/**
 * Generate and store a learning activity statement for a user viewing an assignment
 *
 * @param  {Object}         config                            @see config
 * @param  {Object}         statement                         @see statement
 * @param  {String}         statement.metadata.assignment     The URL of the assignment that was viewed
 * @param  {Function}       [callback]                        @see callback
 */
var view = module.exports.view = function(config, statement, callback) {
  // Input validation
  var validationError = StatementUtil.validate(config, statement, {
    'assignment': {
      'type': 'uri',
      'required': true
    }
  });
  if (validationError) {
    return callback(validationError);
  }

  StatementUtil.processStatement(config, statement, {
    'verb': VERBS.VIEWED,
    'XAPI': {
      'uuid': [statement.timestamp, statement.metadata.assignment, StatementUtil.XAPI.getUserId(statement.actor)],
      'object': StatementUtil.XAPI.generateUuid(config.platform, VERBS.CREATED, [statement.metadata.assignment])
    },
    'CALIPER': {
      'type': CaliperEventType.VIEWED,
      'object': StatementUtil.Caliper.generateEntity({
        'type': CaliperDigitalResourceType.ASSIGNABLE_DIGITAL_RESOURCE,
        'id': statement.metadata.assignment
      })
    }
  }, callback);
};

/**
 * Generate and store a learning activity statement for a user submitting an assignment submission
 *
 * @param  {Object}         config                            @see config
 * @param  {Object}         statement                         @see statement
 * @param  {String}         statement.metadata.id             The URL of the assignment submission
 * @param  {String}         statement.metadata.assignment     The URL of the assignment for the submission
 * @param  {String}         [statement.metadata.submission]   The content of the assignment submission. This can be a text response or a link to the response
 * @param  {Function}       [callback]                        @see callback
 */
var submit = module.exports.submit = function(config, statement, callback) {
  // Input validation
  var validationError = StatementUtil.validate(config, statement, {
    'id': {
      'type': 'uri',
      'required': true
    },
    'assignment': {
      'type': 'uri',
      'required': true
    },
    'submission': {
      'type': 'string',
      'required': false
    }
  });
  if (validationError) {
    return callback(validationError);
  }

  StatementUtil.processStatement(config, statement, {
    'verb': VERBS.SUBMITTED,
    'XAPI': {
      'uuid': [statement.metadata.id],
      'object': StatementUtil.XAPI.generateUuid(config.platform, VERBS.CREATED, [statement.metadata.assignment]),
      'result': {
        'completion': true,
        'response': statement.metadata.submission
      }
    },
    'CALIPER': {
      'type': CaliperEventType.ASSESSMENT,
      'object': StatementUtil.Caliper.generateEntity({
        'type': CaliperDigitalResourceType.ASSIGNABLE_DIGITAL_RESOURCE,
        'id': statement.metadata.assignment
      }),
      'generated': StatementUtil.Caliper.generateEntity({
        'type': CaliperEntityType.ATTEMPT,
        'id': statement.metadata.id,
        'description': statement.metadata.submission,
        'assignable': statement.metadata.assignment,
        'endedAtTime': StatementUtil.generateDate(statement.timestamp),
        'actor': StatementUtil.Caliper.generatePerson(statement.actor)
      })
    }
  }, callback);
};

/**
 * Generate and store a learning activity statement for a user grading an assignment submission
 *
 * @param  {Object}         config                            @see config
 * @param  {Object}         statement                         @see statement
 * @param  {String}         statement.metadata.id             The URL of the assignment submission that is graded
 * @param  {String}         statement.metadata.assignment     The URL of the assignment for the submission
 * @param  {Number}         statement.metadata.grade          The grade for the assignment submission
 * @param  {Number}         [statement.metadata.grade_min]    The minimum possible grade for the assignment
 * @param  {Number}         [statement.metadata.grade_max]    The maximum possible grade for the assignment
 * @param  {Function}       [callback]                        @see callback
 */
var grade = module.exports.grade = function(config, statement, callback) {
  // Input validation
  var validationError = StatementUtil.validate(config, statement, {
    'id': {
      'type': 'uri',
      'required': true
    },
    'assignment': {
      'type': 'uri',
      'required': true
    },
    'grade': {
      'type': 'number',
      'required': true
    },
    'grade_min': {
      'type': 'number',
      'required': false
    },
    'grade_max': {
      'type': 'number',
      'required': false
    }
  });
  if (validationError) {
    return callback(validationError);
  }

  var scaled_score = null;
  if (statement.metadata.grade_max) {
    scaled_score = statement.metadata.grade / statement.metadata.grade_max;
  }

  StatementUtil.processStatement(config, statement, {
    'verb': VERBS.SCORED,
    'XAPI': {
      'uuid': [statement.metadata.id],
      'object': StatementUtil.XAPI.generateUuid(config.platform, VERBS.SUBMITTED, [statement.metadata.id]),
      'result': {
        'score': {
          'raw': statement.metadata.grade,
          'min': statement.metadata.grade_min,
          'max': statement.metadata.grade_max,
          'scaled': scaled_score
        }
      }
    },
    'CALIPER': {
      'type': '',
      'object': StatementUtil.Caliper.generateEntity({
        'type': CaliperEntityType.ATTEMPT,
        'id': statement.metadata.id
      }),
      'generated': StatementUtil.Caliper.generateEntity({
        'type': CaliperEntityType.RESULT,
        'assignable': statement.metadata.assignment,
        'totalScore': statement.metadata.grade,
        'normalScore': scaled_score,
        'scoredBy': StatementUtil.Caliper.generatePerson(statement.actor)
      })
    }
  }, callback);
};

/**
 * Generate and store a learning activity statement for a user providing feedback on an assignment submission
 *
 * @param  {Object}         config                            @see config
 * @param  {Object}         statement                         @see statement
 * @param  {String}         statement.metadata.id             The URL of the assignment submission feedback
 * @param  {String}         statement.metadata.submission     The URL of the assignment submission for the feedback
 * @param  {String}         statement.metadata.feedback       The feedback provided on the assignment submission
 * @param  {Function}       [callback]                        @see callback
 */
var feedback = module.exports.feedback = function(config, statement, callback) {
  // Input validation
  var validationError = StatementUtil.validate(config, statement, {
    'id': {
      'type': 'uri',
      'required': true
    },
    'submission': {
      'type': 'uri',
      'required': true
    },
    'feedback': {
      'type': 'string',
      'required': true
    }
  });
  if (validationError) {
    return callback(validationError);
  }

  StatementUtil.processStatement(config, statement, {
    'verb': VERBS.COMMENTED,
    'XAPI': {
      'uuid': [statement.metadata.id],
      'object': StatementUtil.XAPI.generateUuid(config.platform, VERBS.SUBMITTED, [statement.metadata.submission]),
      'result': {
        'response': statement.metadata.feedback
      }
    },
    'CALIPER': {
      'object': StatementUtil.Caliper.generateEntity({
        'id': statement.metadata.id,
        'description': statement.metadata.feedback
      }),
      'target': StatementUtil.Caliper.generateEntity({
        'type': CaliperEntityType.ATTEMPT,
        'id': statement.metadata.id
      })
    }
  }, callback);
};
