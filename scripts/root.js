var root = angular.module('root', ["ngResource", "mediaPlayer", "ngRoute"]);

root.filter('humanizeTime', function() {
  return function(seconds, short) {
    var dur, time;
    if (short == null) {
      short = false;
    }
    dur = moment.duration(seconds, 'seconds');
    time = {
      years: Math.round(dur.years()),
      months: Math.round(dur.months()),
      days: Math.round(dur.days()),
      hours: Math.round(dur.hours()),
      minutes: Math.round(dur.minutes()),
      seconds: Math.round(dur.seconds())
    };
    if (short) {
      if (time.hours > 0) {
        return time.hours + ":" + ("00" + time.minutes).slice(-2) + ":" + ("00" + time.seconds).slice(-2);
      }
      return time.minutes + ":" + ("00" + time.seconds).slice(-2);
    }
    if (time.years > 0) {
      return time.years + " years and " + time.months + " months";
    }
    if (time.months > 0) {
      return time.months + " months and " + time.days + " days";
    }
    if (time.days > 0) {
      return time.days + " days and " + time.hours + " hours";
    }
    if (time.hours > 0) {
      return time.hours + " hours and " + time.minutes + " minutes";
    }
    if (time.minutes > 0) {
      return time.minutes + " minutes and " + time.seconds + " seconds";
    }
    if (time.seconds > 0) {
      return time.seconds + " seconds";
    }
  };
});

root.config(function($routeProvider) {
  $routeProvider.when('/browse', {
    templateUrl: 'browse.html',
    controller: 'index'
  }).when('/hello', {
    templateUrl: 'test.html',
    controller: 'test'
  });
});

root.controller('test', function($scope) {
  $scope.message = 'Hello';
});

root.controller("index", ["$scope", "$resource", function ($scope, $resource) {
  var artists = $resource('http://iguana-staging.app.alecgorge.com/api/artists');
  var years = $resource('http://iguana-staging.app.alecgorge.com/api/artists/:artist_slug/years');
  var shows = $resource('http://iguana-staging.app.alecgorge.com/api/artists/:artist_slug/years/:year_slug');
  var recordings = $resource('http://iguana-staging.app.alecgorge.com/api/artists/:artist_slug/years/:year_slug/shows/:show_date');

  var current_artist;
  var current_year;
  var current_venue;
  var total_time_seconds;

  window.iguanaScope = $scope;

  artists.get().$promise.then(function(result) {
    $scope.artists = result.data;
  });

  $scope.getYears = function(artist, $event) {
    selectElement($event.target);

    years.get({artist_slug: artist.slug}).$promise.then(function(result) {
      current_artist = artist;
      $scope.years = result.data;
      $scope.artist = current_artist.name;

      // reset other lists
      $scope.shows = [];
      $scope.recordings = [];
    });
  };

  $scope.getShows = function(year, $event) {
    selectElement($event.target);

    shows.get({artist_slug: current_artist.slug, 
               year_slug: year.year}).$promise.then(function(result) {
      current_year = year;
      $scope.shows = result.data.shows;

      // reset other lists
      $scope.recordings = [];
    });
  };

  $scope.getRecordings = function(show, $event) {
    selectElement($event.target);

    recordings.get({artist_slug: current_artist.slug, 
                    year_slug: current_year.year, 
                    show_date: show.display_date}).$promise.then(function(result) {
      $scope.recordings = result.data[0].tracks;
      $scope.source = result.data[0];

      current_venue = show.display_date + " — " + show.venue_name + ', ' + show.venue_city;
    });
  };

  $scope.playSong = function(recording, $event) {
    selectElement($event.target);


    $scope.title = recording.title;
    total_time_seconds = recording.length;

    if(!$scope.audio1.playing) {
      $scope.audio1.load([{ src: recording.file, type: 'audio/mp3' }, true]);
      $scope.audio1.playPause();
    } else {
      $scope.audio1.playPause();
      // temp workaround
      window.setTimeout(function() {
        $scope.audio1.load([{ src: recording.file, type: 'audio/mp3' }, false]);
        $scope.audio1.playPause();
      }, 100);
    }

    $scope.venue = current_venue;
    var length = recording.length;
    var min = Math.floor(length/60);
    var sec = pad(length % 60, 2);
    $scope.total_time = min + ':' + sec;
    $scope.current_time = '0:00';
  };

  $scope.$watch("audio1.currentTime", function (newValue) {
    if(newValue) {
      var min = Math.floor(newValue/60);
      var sec = pad(Math.floor(newValue) % 60, 2);
      $scope.current_time = min + ':' + sec;
    } else {
      $scope.current_time = '';
    }

    $scope.current_time_percentage = newValue / total_time_seconds * 100 + '%';
  });

  $scope.$watch("audio1.volume", function (newValue) {
    $scope.current_volume_percentage = newValue * 100 + '%';
  });

  $scope.nextSong = function() {
    $scope.audio1.next();
  };

  $scope.playButton = function() {
    $scope.audio1.playPause();
  }

  $scope.seekTo = function(timePercent) {
    $scope.audio1.seek(timePercent * total_time_seconds);
  }

}]);

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function selectElement(target) {
  $(target).parent().parent().children().children().removeClass('selected');
  $(target).addClass('selected');
}
