const axios = require('axios')
const rateLimit = require('axios-rate-limit');


// Source Radarr
const src = {
    accessKey: '',
    host: '127.0,0,1',
    port: 7878,
    basePath: '/'
};

// Destination Radarr
const dst = {
    accessKey: '',
    host: 'myhostname.com',
    port: 7878,
    basePath: '/',
    profile: 4, // profile id
    monitored: true, // add movies in monitored status
    savePath: '/download/dir' // base path where downloads are stored
};

const http = rateLimit(axios.create(), {maxRequests: 1, perMilliseconds: 500});

class Movies {
    constructor(config) {
        this.cfg = config;
    }

    getMovies(cb, monitored) {
        if (typeof monitored === 'undefined') monitored = false;
        const src = this.cfg;
        try {
            console.log('URL ' + src.host + ':' + src.port + src.basePath + 'api/movie?apiKey=' + src.accessKey);
            const res = http.get('http://' + src.host + ':' + src.port + src.basePath + 'api/movie?apiKey=' + src.accessKey);
            res.then((returnData) => {

                cb(returnData.data.filter((movie) => {
                    if (monitored) return (movie.monitored);
                    return true;
                }));
            });
        } catch (e) {
            console.log(e);
        }

    }

    getMovieSearchURL(movie) {
        const cfg = this.cfg;
        if (movie.imdbId !== '') return {
            'type': 'imdb',
            id: movie.imdbId,
            url: 'http://' + src.host + ':' + src.port + src.basePath + 'api/movie/lookup/imdb?imdbId=' + movie.imdbId + '&apiKey=' + src.accessKey
        }; else return {
            'type': 'tmdbId', id: movie.tmdbId,
            url: 'http://' + src.host + ':' + src.port + src.basePath + 'api/movie/lookup/tmdb?tmdbId=' + movie.tmdbId + '&apiKey=' + src.accessKey
        }
    }

    getAddMovieURL() {
        return 'http://' + this.cfg.host + ':' + this.cfg.port + this.cfg.basePath + 'api/movie/?apiKey=' + this.cfg.accessKey;
    }

    searchMovie(movie, cb) {
        http.get(this.getMovieSearchURL(movie).url).then((res) => {
            console.log(res.data);
            if (typeof res.data === 'object') {
                if (!res.data.monitored) cb(res);
            }
        });

    }

    addMovie(movie, cb) {
        console.log(
            {
                url: this.getAddMovieURL(),
                postData: {
                    title: movie.title,
                    qualityProfileId: this.cfg.profile,
                    titleSlug: movie.titleSlug,
                    tmdbId: movie.tmdbId,
                    images: movie.images,
                    year: movie.year,
                    path: this.cfg.savePath + movie.title + ' (' + movie.year + ')'
                }
            }
        );

        http.post(this.getAddMovieURL(), {
            title: movie.title,
            qualityProfileId: this.cfg.profile,
            titleSlug: movie.titleSlug,
            tmdbId: movie.tmdbId,
            images: movie.images,
            year: movie.year,
            path: this.cfg.savePath + movie.title + ' (' + movie.year + ')'
        }).then((res) => cb(res.data)).catch((e) => {
            console.log('error', e);
        })
    }

}

function existsInList(movie, list) {
    list.forEach(checkMovie => {
        if (movie.titleSlug === checkMovie.titleSlug) {
            return true;
        }
    });

    return false;
}

const srcMovies = new Movies(src);
const dstMovies = new Movies(dst);

srcMovies.getMovies(res => {
    dstMovies.getMovies(dstRes => {

            // find movies that don't exist on destination
            const moviesToAdd = [];
            res.forEach((srcMovie) => {
                if (!existsInList(srcMovie, dstRes)) {
                    moviesToAdd.push(srcMovie);
                }
            });

            console.log('The following movies must be added:');


            moviesToAdd.forEach((movie) => {
                console.log(movie.title + ' (' + movie.year + ')');
                console.log(movie);
                dstMovies.addMovie(movie, (res) => {
                    console.log(movie.titleSlug + ' added');
                });
            });

        }, false
    );
}, true);

