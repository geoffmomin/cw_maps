$.support.cors = true;

function CWMAP() {
    this.is_fullscreen = false;
    this.small_map_styles = {0: 0};
    this.latlngbounds = null;
    this.infobox = null; // Only one can be visible at a time
    this.infoboxMarker = null; // Used to determine which marker's infobox is currently visible & support toggling them by clicking on them.
    this.markers = null;
    this.path_markers = null;
    this.paths = null;
    this.projects = {};
    this.search_id = '';
    this.map = null;
    this.maxZoomService = null;
    this.cluster = null;
    this.first_search = true; // used to disable google analytics event tracking for the initial search
    this.functionality = [];

    // ALL! CWMAP URLS
    this.tiles_base_url = '//maptiles.charitywater.org/cwmap.1/'
    this.base_url = '//maps.charitywater.org/';

    // Selectors
    this.default_selectors = {
        'map_stat_projects' : '#map_stat_projects',
        'map_stat_countries' : '#map_stat_countries',
        'map_stat_partners' : '#map_stat_partners',
        'search_form' : '#search_form',
        'search_input' : '#search_input',
        'autocomplete_form' : '#search_form',
        'autocomplete_input' : '#search_input',
        'search_id_input' : '#search_id_input',
        'search_rig_map_input': '#search_rig_map_input',
        'clear_button' : '#clear_button',
        'search_button' : '#search_button',
        'search_results' : '#search_results',
        'close_fullscreen_button' : '#close_fullscreen_button',
        'search_bar' : '#search_bar',
        'search_bar_spacer' : '#search_bar_spacer',
        'info_bar' : '#info_bar',
        'map_controls' : '#map_controls',
        'share_button' : '#share_button',
        'fullscreen_button' : '#fullscreen_button',
        'map_button' : '#map_button',
        'satellite_button' : '#satellite_button',
        '2011_button': '#2011_button',
        'total_years_button': '#total_years_button',
        'vertical_map_controls' : '#vertical_map_controls',
        'increase_zoom_control' : '#increase_zoom_control',
        'decrease_zoom_control' : '#decrease_zoom_control',
        'zoom_control' : '#zoom_control',
        'zoom_control_container': '#zoom_control_container',
        'share_map_url' : '#share_map_url',
        'share_embed_map' : '#share_embed_map',
        'share_embed_map_width' : '#share_embed_map_width',
        'share_embed_map_height' : '#share_embed_map_height',
        'search_filter_project_completion_year_input': '#search_filter_project_completion_year_input',
        'search_filter_country_id_input': '#search_filter_country_id_input',
        'country_filter_map_controls' : '#country_filter_map_controls',
        'year_filter_map_controls': '#year_filter_map_controls'
    };
};

// Constants used to show/hide controls
CWMAP.share_button = 'share';
CWMAP.fullscreen_button = 'fullscreen';
CWMAP.map_button = 'map';
CWMAP.satellite_button = 'satellite';
CWMAP.zoom_button = 'zoom';
CWMAP.search = 'search';
CWMAP.infobar = 'infobar';

// Constants used to control functionality
CWMAP.disable_infowindows = 'disable_infowindows';
CWMAP.do_not_auto_submit = 'do_not_auto_submit';
CWMAP.do_not_auto_zoom = 'do_not_auto_zoom';
CWMAP.do_not_auto_open_infowindows = 'do_not_auto_open_infowindows';
CWMAP.auto_fullscreen = 'auto_fullscreen';
CWMAP.rig_map = 'rig_map';
CWMAP.year_filter_map_controls = 'year_filter_map_controls';
CWMAP.standard_controls = 'standard_controls';

CWMAP.prototype.init = function(mapdiv, projects, search_id, search_term, exclude_controls, functionality, override_base_url, override_selectors, after_method) {
    if(!exclude_controls) { exclude_controls = []; }
    if(!functionality) { functionality = []; }
    if(!after_method) { after_method = function() {} }
    if(typeof override_base_url != 'undefined') { this.base_url = override_base_url; }
    this.initURLs();
    this.initSelectors(override_selectors);

    var this_cwmap = this;
    $.ajax( // load underscore templates
        //this.base_url + 'js/cwmap.php', {
        'cwmap.templates.html', {
        //dataType: 'jsonp',
        success: function(data) {
            $('body').append(data);
            this_cwmap.loadCSS();

            this_cwmap.markers = new Array();
            this_cwmap.path_markers = new Array();
            this_cwmap.paths = new Array();
            this_cwmap.selectors['map'] = '#' + mapdiv;
            this_cwmap.search_id = search_id
            this_cwmap.functionality = functionality
            this_cwmap.rig_map = 0;
            if($.inArray(CWMAP.rig_map, this_cwmap.functionality) != -1) {
                this_cwmap.rig_map = 1;
                this_cwmap.functionality.push(CWMAP.do_not_auto_zoom);
            }

            this_cwmap.initMap();
            this_cwmap.initTileOverlay();
            this_cwmap.initControls(search_term, exclude_controls);

            this_cwmap.cluster = new MarkerClusterer(this_cwmap.map, this_cwmap.markers, {
                gridSize: 25,
                maxZoom: 10,
                averageCenter: true,
                minimumClusterSize: 5,
                styles: [
                    {height: "52", width: "52", xOffset: 0, yOffset: 13, textColor: '#fff', textSize: 10, url: this_cwmap.small_cluster_image_url},
                    {height: "70", width: "70", xOffset: 0, yOffset: 20, textColor: '#fff', textSize: 12, url: this_cwmap.medium_cluster_image_url},
                    {height: "90", width: "90", xOffset: 0, yOffset: 26, textColor: '#fff', textSize: 14, url: this_cwmap.large_cluster_image_url}
                ]});

            this_cwmap_cwmap = this_cwmap;
            var auto_fullscreen_listenter = google.maps.event.addListener(this_cwmap.map, 'idle', function() {
                google.maps.event.removeListener(auto_fullscreen_listenter)
                if($.inArray(CWMAP.auto_fullscreen, this_cwmap_cwmap.functionality) != -1) {
                    $(this_cwmap_cwmap.selectors['fullscreen_button']).trigger('click')
                }
            });

            this_cwmap.updateStats();
            this_cwmap.updateMap(projects);

            after_method();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Should never happen, just used for testing/debugging
            // console.log(jqXHR);
            // console.log(textStatus);
            // console.log(errorThrown);
        }
    });
};

CWMAP.prototype.initURLs = function() {
    this.infobox_base_url = this.base_url + '/projects/map_info_window/';
    this.embed_base_url = this.base_url + '/maps/embed/';
    this.stats_url = this.base_url + '/maps/ajax_stats',
    this.autocomplete_url = this.base_url + '/maps/autocomplete_search',
    this.search_url = this.base_url + '/maps/ajax_search',

    // this.stylesheet_url = this.base_url + '/css/cwmap.css?v=12'
    this.stylesheet_url = 'css/cwmap.css'
    this.project_marker_image_url = this.base_url + '/img/map/default.png'
    this.rig_marker_image_url = this.base_url + '/img/map/rig-marker-jerry.png'
    this.path_marker_image_url = this.base_url + '/img/map/map-marker.png?v=1'

    this.marker_image_url = this.base_url + '/img/map/default.png'
    this.small_cluster_image_url =  this.base_url + "/img/map/cluster_small.png";
    this.medium_cluster_image_url =  this.base_url + "/img/map/cluster_medium.png";
    this.large_cluster_image_url =  this.base_url + "/img/map/cluster_large.png";

    this.small_clear_button_image_url = this.base_url + "/img/map/clear_button_small.png";
    this.small_search_button_image_url = this.base_url + "/img/map/search_button_small.png";
    this.exit_fullscreen_button_image_url = this.base_url + "/img/map/exit_fullscreen_button.png";
}

CWMAP.prototype.initSelectors = function(override_selectors) {
    if(!override_selectors) { override_selectors = {}};

    this.selectors = this.default_selectors;
    for(key in override_selectors) {
        this.selectors[key] = override_selectors[key];
    }
}

CWMAP.prototype.updateStats = function() {
    var this_cwmap = this;
    $.ajax({
        type: 'get',
        url: this.stats_url,
        dataType: 'jsonp',
        success: function(data, textStatus, jqXHR) {
            // Infobar Stats
            $(this_cwmap.selectors['map_stat_projects']).html(data.stats.projects).format({format: "000,000"})
            $(this_cwmap.selectors['map_stat_countries']).html(data.stats.countries)
            $(this_cwmap.selectors['map_stat_partners']).html(data.stats.partners)

            // Country Filters
            $(this_cwmap.selectors['country_filter_map_controls'] + " ul").append(
                _.template($('#cwmap_country_filter_li_template').html(), {country_id: '', country_name: 'All Countries'})
            );
            _.each(_.sortBy(data.countries, function(x) {return x;}), function(country_name, country_id) {
                $(this_cwmap.selectors['country_filter_map_controls'] + " ul").append(
                    _.template($('#cwmap_country_filter_li_template').html(), {country_id: country_id, country_name: country_name})
                );
            })

            $(this_cwmap.selectors['country_filter_map_controls'] + ' li').click(function(p_xEvent) {
                $(p_xEvent.target).addClass('cwmap_active');
                $(p_xEvent.target).siblings().removeClass('cwmap_active');

                $(this_cwmap.selectors['search_filter_country_id_input']).val($(p_xEvent.target).data('filter'));
                $(this_cwmap.selectors['search_form']).submit();
            })
        },
        error: function(e) {
            // alert('Error!') // Do something better?
        }
    });
}

CWMAP.prototype.loadCSS = function() {
    if (document.createStyleSheet) {
        document.createStyleSheet(this.stylesheet_url);
    } else {
        $('<link rel="stylesheet" type="text/css" href="' + this.stylesheet_url + '" />').appendTo('head');
    }
}

CWMAP.prototype.initControls  = function(search_term, exclude_controls) {
    $(this.selectors['map']).append(_.template($('#cwmap_controls_template').html(), {'this_cwmap': this, 'search_term': search_term}))

    // Search Bar
    if($.inArray(CWMAP.search, exclude_controls) == -1) {
        this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(document.getElementById($(this.selectors['search_bar']).attr('id')));
        this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(document.getElementById($(this.selectors['search_bar_spacer']).attr('id')));

        this.initSearchBoxUI();
        this.initAutoComplete();
    }
    // Init form submit handler even if we're not displaying the search
    // form, we need it for the embed panel to work
    this.initFormSubmitHandler();
    if($.inArray(CWMAP.do_not_auto_submit, this.functionality) == -1) {
        $(this.selectors['search_form']).submit();
    }

    // Info Bar
    if($.inArray(CWMAP.infobar, exclude_controls) == -1) {
        this.map.controls[google.maps.ControlPosition.BOTTOM].push(document.getElementById($(this.selectors['info_bar']).attr('id')));
    }

    // Horizontal Map Controls
    if($.inArray(CWMAP.standard_controls, exclude_controls) == -1) {
        this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(document.getElementById($(this.selectors['map_controls']).attr('id')));
    }

    // Vertical Map Controls (zoom slider)
    this.map.controls[google.maps.ControlPosition.LEFT_TOP].push(document.getElementById($(this.selectors['vertical_map_controls']).attr('id')));

    var this_cwmap = this;

    // Zoom Slider & Controls
    if($.inArray(CWMAP.zoom_button, exclude_controls) == -1) {
        $(this_cwmap.selectors['zoom_control']).slider({
            orientation: "vertical",
            min: this.map.minZoom,
            max: this.map.maxZoom,
            value: this.map.getZoom(),
            slide: function(event, ui) {
                this_cwmap.map.setZoom(ui.value)
            }
        })

        // Note that by zooming using the zoom slider on a non-rig map, you remain centered on the last opened project
        var this_cwmap = this;
        $(this_cwmap.selectors['increase_zoom_control']).click(function() {
            if(this_cwmap.infobox && !this_cwmap.rig_map ) { this_cwmap.map.setCenter(this_cwmap.infobox.getPosition()); }
            this_cwmap.map.setZoom(this_cwmap.map.getZoom()+1);
        })

        $(this_cwmap.selectors['decrease_zoom_control']).click(function() {
            if(this_cwmap.infobox && !this_cwmap.rig_map) { this_cwmap.map.setCenter(this_cwmap.infobox.getPosition()); }
            this_cwmap.map.setZoom(this_cwmap.map.getZoom()-1);
        })

        google.maps.event.addListener(this.map, 'zoom_changed', function(event) {
            if(this_cwmap.infobox && !this_cwmap.rig_map) { this_cwmap.map.setCenter(this_cwmap.infobox.getPosition()); }
            $('#zoom_control').slider("value", this_cwmap.map.getZoom())
        })
    } else {
        $(this_cwmap.selectors['vertical_map_controls']).hide();
    }

    // Vertical Info Bar
    if($.inArray(CWMAP.country_filter_map_controls, this.functionality) != -1) {
        this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(document.getElementById($(this.selectors['country_filter_map_controls']).attr('id')));
    }

    // Year Filter Controls
    if($.inArray(CWMAP.year_filter_map_controls, this_cwmap.functionality) != -1) {
        this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(document.getElementById($(this.selectors['year_filter_map_controls']).attr('id')));

        $(this_cwmap.selectors['2011_button']).click(function() {
            $(this_cwmap.selectors['2011_button']).addClass('cwmap_active_button');
            $(this_cwmap.selectors['2011_button']).siblings().removeClass('cwmap_active_button');

            $(this_cwmap.selectors['search_filter_project_completion_year_input']).val('2011')
            $(this_cwmap.selectors['search_form']).submit()
        });

        $(this_cwmap.selectors['total_years_button']).click(function() {
            $(this_cwmap.selectors['total_years_button']).addClass('cwmap_active_button');
            $(this_cwmap.selectors['total_years_button']).siblings().removeClass('cwmap_active_button');

            $(this_cwmap.selectors['search_filter_project_completion_year_input']).val('')
            $(this_cwmap.selectors['search_form']).submit()
        });
    } else {
        $(this_cwmap.selectors['year_filter_map_controls']).hide();
    }


    // Share Button
    if($.inArray(CWMAP.share_button, exclude_controls) == -1) {
        $(this_cwmap.selectors['share_button']).click( function() {
            if(!$(this_cwmap.selectors['map']+'_share').length>0) {
                var share_map_url = $(location).attr('href');
                share_map_url = share_map_url.replace(/#.*$/, "") // get rid of any document hash that may already be in place
                share_map_url = share_map_url.replace(/\?.*$/, "") // get rid of any get parameters
                if(this_cwmap.search_id == null) { this_cwmap.search_id = ''; }
                if(this_cwmap.search_id != '') {
                    share_map_url = share_map_url+"#"+this_cwmap.search_id;
                }

                // Share Panel html
                $(this_cwmap.selectors['map']).after(_.template($('#cwmap_share_panel_template').html(), {this_cwmap: this_cwmap, share_map_url: share_map_url}))

                // Share Panel Functionality JS
                $(".cwmap_share a.close").on("click", function() {
                    $(this_cwmap.selectors['share_button']).click();
                });
                $(this_cwmap.selectors['share_embed_map_width']).on("keyup blur", function() {
                    $(this_cwmap.selectors['share_embed_map']).val($(this_cwmap.selectors['share_embed_map']).val().replace(/width=".*?"/,"width=\""+$(this_cwmap.selectors['share_embed_map_width']).val()+"\""));
                });
                $(this_cwmap.selectors['share_embed_map_height']).on("keyup blur", function() {
                    $(this_cwmap.selectors['share_embed_map']).val($(this_cwmap.selectors['share_embed_map']).val().replace(/height=".*?"/,"height=\""+$(this_cwmap.selectors['share_embed_map_height']).val()+"\""));
                });
                $(this_cwmap.selectors['share_map_url'] + ", " +
                  this_cwmap.selectors['share_embed_map_height']  + ", " +
                  this_cwmap.selectors['share_embed_map_width']  + ", " +
                  this_cwmap.selectors['share_embed_map']).on("focus",
                function() {
                    this.select();
                }).on('mouseup', function(e) {
                    e.preventDefault();
                });
                $(this_cwmap.selectors['share_embed_map']).val($.trim($(this_cwmap.selectors['share_embed_map']).val()));

                this_cwmap.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(document.getElementById($(this_cwmap.selectors['map']+"_share").attr('id')));
                $(this_cwmap.selectors['map']+"_share").show();

                $(this_cwmap.selectors['share_button']).css({ backgroundPosition: 'bottom' });
            } else {
                this_cwmap.map.controls[google.maps.ControlPosition.RIGHT_TOP].pop();
                $(this_cwmap.selectors['map']+'_share').remove();
                $(this_cwmap.selectors['share_button']).css({ backgroundPosition: '0 0' });
            }
        })
        $(this_cwmap.selectors['share_button']).hover(function() {
            $(this_cwmap.selectors['share_button']).css({backgroundPosition: 'bottom'});
        }, function() {
            if(!$(this_cwmap.selectors['map']+'_share').length>0) {
                $(this_cwmap.selectors['share_button']).css({backgroundPosition: 'top'});
            }
        })
    } else {
        var button_width = $(this_cwmap.selectors['share_button']).outerWidth(true);
        $(this_cwmap.selectors['share_button']).hide();
        // $('#map_controls').width($('#map_controls').width() - button_width);
    }

    // Fullscreen Button
    if($.inArray(CWMAP.fullscreen_button, exclude_controls) == -1) {
        $(this_cwmap.selectors['fullscreen_button'] + ', ' + this_cwmap.selectors['close_fullscreen_button']).click(function() {
            if(this_cwmap.is_fullscreen) {
                this_cwmap.is_fullscreen = false;
                $(this_cwmap.selectors['map']).toggleClass('cwmap_fullscreen');

                // Disable scrollwheel zoom
                this_cwmap.map.setOptions({scrollwheel: false});

                // Restore Map
                $(this_cwmap.selectors['map']).css(this_cwmap.small_map_styles['map']);
                $("body").css("overflow", "auto");
                $('#page').show();
                $(this_cwmap.selectors['map']).width('100%');

                // Restore scroll position
                $(window).scrollTop(this_cwmap.small_map_styles['scrollTop']);

                // Restore Search Bar
                $(this_cwmap.selectors['search_form']).css(this_cwmap.small_map_styles['search_form'])
                $(this_cwmap.selectors['search_form'] + ' label.search_input_label').html(this_cwmap.small_map_styles['search_form label html']).css(this_cwmap.small_map_styles['search_form label'])
                $(this_cwmap.selectors['search_input']).css(this_cwmap.small_map_styles['search'])
                $(this_cwmap.selectors['clear_button']).css(this_cwmap.small_map_styles['clear_button'])
                $(this_cwmap.selectors['search_button']).css(this_cwmap.small_map_styles['search_button'])
                $(this_cwmap.selectors['search_results']).css(this_cwmap.small_map_styles['search_results'])
                $(this_cwmap.selectors['search_bar'] + ', ' + this_cwmap.selectors['search_bar_spacer']).css(this_cwmap.small_map_styles['search_bar, search_bar_spacer'])

                // Toggle Launch/Exit Fullscreen buttons
                $(this_cwmap.selectors['fullscreen_button']).css(this_cwmap.small_map_styles['fullscreen_button'])
                // $('#map_controls').css(this_cwmap.small_map_styles['map_controls'])
                $(this_cwmap.selectors['close_fullscreen_button']).hide();

                // Toggle Info Bar
                $(this_cwmap.selectors['info_bar']).show();

                // Restore default search box text
                $(this_cwmap.selectors['search_input']).unplaceholder();
                $(this_cwmap.selectors['search_input']).attr('placeholder', 'Search by plaque text, village, country, GPS or partner');
                $(this_cwmap.selectors['search_input']).placeholder();

            } else {
                this_cwmap.is_fullscreen = true;
                $(this_cwmap.selectors['map']).toggleClass('cwmap_fullscreen');

                // Enable scrollwheel zoom
                this_cwmap.map.setOptions({scrollwheel: true});

                // backup current styles so we can restore them later
                // correction: several styles switch between predefined values so we can support the auto_fullscreen
                // feature
                this_cwmap.small_map_styles['map'] = {
                    // height : $(this_cwmap.selectors['map']).css('height'),
                    // width : $(this_cwmap.selectors['map']).css('width'),
                    // top : $(this_cwmap.selectors['map']).css('top'),
                    // left : $(this_cwmap.selectors['map']).css('left'),
                    // position : $(this_cwmap.selectors['map']).css('position')
                    height: '926px',
                    width: '100%',
                    top: 'auto',
                    left: 'auto',
                    position: 'relative'
                };

                this_cwmap.small_map_styles['scrollTop'] = $(window).scrollTop();

                // Make the map go fullscreen
                $(this_cwmap.selectors['map']).css({ height: '100%', width: '100%', top: '0px', left: '0px', position: 'absolute' });
                $("body").css("overflow", "hidden");
                $('#page').hide();

                // Toggle Search Bar, Launch/Exit Fullscreen buttons
                // Note that IE doesn't let us just specify 'margin' so we have
                // to specify each margin individually
                this_cwmap.small_map_styles['search_form'] = {
                    width: $(this_cwmap.selectors['search_form']).css('width'),
                    marginTop: $(this_cwmap.selectors['search_form']).css('marginTop'),
                    marginBottom: $(this_cwmap.selectors['search_form']).css('marginBottom'),
                    marginLeft: 'auto', // $(this_cwmap.selectors['search_form']).css('marginLeft'), // reads as '0px' instead of auto for some reason?
                    marginRight: 'auto', // $(this_cwmap.selectors['search_form']).css('marginRight'), // reads as '0px' instead of auto for some reason?
                    minWidth: $(this_cwmap.selectors['search_form']).css('minWidth')
                 };
                $(this_cwmap.selectors['search_form']).css({width: '100%', marginTop: '15px', marginLeft: '15px', marginRight: '15px', marginBottom: '15px', minWidth: '975px'})

                this_cwmap.small_map_styles['search_form label'] = {
                    marginTop: $(this_cwmap.selectors['search_form'] + 'label').css('margin-top'),
                    marginLeft: $(this_cwmap.selectors['search_form'] + 'label').css('margin-left') };
                this_cwmap.small_map_styles['search_form label html'] = $(this_cwmap.selectors['search_form'] + ' label').html()
                $(this_cwmap.selectors['search_form'] + ' label.search_input_label').html('SEARCH THE MAP.').css({marginTop: "5px", marginLeft: "2px"})

                this_cwmap.small_map_styles['search'] = {
                    width: $(this_cwmap.selectors['search_input']).css('width'),
                    height: $(this_cwmap.selectors['search_input']).css('height'),
                    marginLeft: $(this_cwmap.selectors['search_input']).css('margin-left'),
                    backgroundPosition: $(this_cwmap.selectors['search_input']).css('background-position'),
                    paddingLeft: $(this_cwmap.selectors['search_input']).css('padding-left'),
                    paddingTop: $(this_cwmap.selectors['search_input']).css('padding-top'),
                    fontSize: $(this_cwmap.selectors['search_input']).css('font-size')
                };
                    $(this_cwmap.selectors['search_input']).css({width: '314px', height: '37px', backgroundPosition: '10px 10px', fontSize: '14px', marginLeft: '-1px', paddingLeft: '39px'})
                if ($.browser.msie && parseInt($.browser.version) < 9) {
                    $(this_cwmap.selectors['search_input']).css({height: '27px', paddingTop: '12px'})
                }

                this_cwmap.small_map_styles['clear_button'] = {
                    marginTop: $(this_cwmap.selectors['clear_button']).css('margin-top'),
                    marginLeft: $(this_cwmap.selectors['clear_button']).css('margin-left'),
                    backgroundImage: $(this_cwmap.selectors['clear_button']).css('background-image'),
                    width: $(this_cwmap.selectors['clear_button']).css('width'),
                    height: $(this_cwmap.selectors['clear_button']).css('height')
                };
                $(this_cwmap.selectors['clear_button']).css({marginTop: "7px", marginLeft: "-56px", backgroundImage: 'url('+this_cwmap.small_clear_button_image_url+')' , width: "50px", height: "26px"})

                this_cwmap.small_map_styles['search_button'] = {
                    backgroundImage: $(this_cwmap.selectors['search_button']).css('background-image'),
                    width: $(this_cwmap.selectors['search_button']).css('width'),
                    height: $(this_cwmap.selectors['search_button']).css('height'),
                    marginLeft: $(this_cwmap.selectors['search_button']).css('margin-left'),
                    marginTop: $(this_cwmap.selectors['search_button']).css('margin-top')
                };
                $(this_cwmap.selectors['search_button']).css({backgroundImage: 'url('+this_cwmap.small_search_button_image_url+')', width: "87px", height: "40px", marginLeft: '7px', marginTop: '1px'})

                this_cwmap.small_map_styles['search_results'] = {
                    marginTop: $(this_cwmap.selectors['search_results']).css('margin-top'),
                    marginLeft: $(this_cwmap.selectors['search_results']).css('margin-left') };
                $(this_cwmap.selectors['search_results']).css({marginTop: "9px", marginLeft: "39px"})

                this_cwmap.small_map_styles['search_bar, search_bar_spacer'] = {
                    height: $(this_cwmap.selectors['search_bar']).css('height')
                }
                $(this_cwmap.selectors['search_bar'] + ', ' + this_cwmap.selectors['search_bar_spacer']).css({height: "72px"})

                // Toggle Launch/Exit Fullscreen buttons
                this_cwmap.small_map_styles['fullscreen_button'] = {
                    backgroundImage: $(this_cwmap.selectors['fullscreen_button']).css('background-image'),
                    width: $(this_cwmap.selectors['fullscreen_button']).css('width')
                };
                $(this_cwmap.selectors['fullscreen_button']).css({backgroundImage: "url("+this_cwmap.exit_fullscreen_button_image_url+")", width: "128px"})

                // this_cwmap.small_map_styles['map_controls'] = {
                //     width: $('#map_controls').css('width') };
                // $('#map_controls').css({width: "416px"})
                $(this_cwmap.selectors['close_fullscreen_button']).show();

                // Toggle Info Bar
                $(this_cwmap.selectors['info_bar']).hide()

                // Shorter default search box text
                $(this_cwmap.selectors['search_input']).unplaceholder();
                $(this_cwmap.selectors['search_input']).attr('placeholder', 'Search by plaque text, village, country …')
                $(this_cwmap.selectors['search_input']).placeholder();

            }
            google.maps.event.trigger(this_cwmap.map, "resize");
        })
    } else {
        var button_width = $(this_cwmap.selectors['fullscreen_button']).outerWidth(true);
        $(this_cwmap.selectors['fullscreen_button']).hide();
        // $('#map_controls').width($('#map_controls').width() - button_width);
    }

    // Map Button
    if($.inArray(CWMAP.map_button, exclude_controls) == -1) {
        google.maps.event.addDomListener(document.getElementById($(this_cwmap.selectors['map_button']).attr('id')), 'click', function() {
            this_cwmap.map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
        })

        if(this_cwmap.map.getMapTypeId() == google.maps.MapTypeId.ROADMAP) {
            $(this_cwmap.selectors['map_button']).css({backgroundPosition: 'bottom'});
        }

        $(this_cwmap.selectors['map_button']).click(function() {
            $(this_cwmap.selectors['map_button']).css({backgroundPosition: 'bottom'});
            $(this_cwmap.selectors['satellite_button']).css({backgroundPosition: 'top'});
        })

        var this_cwmap = this;
        $(this_cwmap.selectors['map_button']).hover(function() {
            $(this_cwmap.selectors['map_button']).css({backgroundPosition: 'bottom'});
        }, function() {
            if(this_cwmap.map.getMapTypeId() != google.maps.MapTypeId.ROADMAP) {
                $(this_cwmap.selectors['map_button']).css({backgroundPosition: 'top'});
            }
        })
    } else {
        var button_width = $(this_cwmap.selectors['map_button']).outerWidth(true);
        $(this_cwmap.selectors['map_button']).hide();
        // $('#map_controls').width($('#map_controls').width() - button_width);
    }

    // Satellite Button
    if($.inArray(CWMAP.satellite_button, exclude_controls) == -1) {
        google.maps.event.addDomListener(document.getElementById($(this_cwmap.selectors['satellite_button']).attr('id')), 'click', function() {
            this_cwmap.map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
        })

        if(this_cwmap.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE) {
            $(this_cwmap.selectors['satellite_button']).css({backgroundPosition: 'bottom'});
        }

        $(this_cwmap.selectors['satellite_button']).click(function() {
            $(this_cwmap.selectors['satellite_button']).css({backgroundPosition: 'bottom'});
            $(this_cwmap.selectors['map_button']).css({backgroundPosition: 'top'});
        })

        var this_cwmap = this;
        $(this_cwmap.selectors['satellite_button']).hover(function() {
            $(this_cwmap.selectors['satellite_button']).css({backgroundPosition: 'bottom'});
        }, function() {
            if(this_cwmap.map.getMapTypeId() != google.maps.MapTypeId.SATELLITE) {
                $(this_cwmap.selectors['satellite_button']).css({backgroundPosition: 'top'});
            }
        })
    } else {
        var button_width = $(this_cwmap.selectors['satellite_button']).outerWidth(true);
        $(this_cwmap.selectors['satellite_button']).hide();
        // $('#map_controls').width($('#map_controls').width() - button_width);
    }
}

CWMAP.prototype.initSearchBoxUI = function() {
    this_cwmap = this;

    $(this_cwmap.selectors['clear_button']).click(function() {
        $(this_cwmap.selectors['search_input']).val('')
        $(this_cwmap.selectors['search_form']).submit()
    })

    $(this_cwmap.selectors['search_button']).click(function() {
        $(this_cwmap.selectors['search_form']).submit()
    })
}

CWMAP.prototype.initAutoComplete = function() {
    this_cwmap = this;

    l_xAutcomplete = $(this_cwmap.selectors['autocomplete_input']).autocomplete({
        delay: 300,
        html: true,
        source: function(req, add) {
            // Change position if we're in fullscreen mode vs not
            $(this_cwmap.selectors['autocomplete_input']).autocomplete({
                position: {
                    my: "center top",
                    at: "center bottom",
                    of: $(this_cwmap.selectors['autocomplete_input']),
                    offset: this_cwmap.is_fullscreen ? "100 21" : "17 21",
                    collision: 'none'
                }});

            var form_data = $(this_cwmap.selectors['autocomplete_form']).serialize();
            var search_val = $(this_cwmap.selectors['autocomplete_input']).val()

            return $.ajax({
                type: 'post',
                url: this_cwmap.autocomplete_url,
                data: $(this_cwmap.selectors['autocomplete_form']).serialize(),
                dataType: 'jsonp',
                success: add,
                beforeSend: function(xhr) {
                    if(typeof _gaq  != 'undefined') _gaq.push(['_trackEvent', 'Maps', 'Autocomplete', search_val.toLowerCase()])
                    }
                });
            },
        select: function(event, ui) {
            $(this_cwmap.selectors['autocomplete_input']).val(ui.item.value);
            $(this_cwmap.selectors['autocomplete_form']).trigger('submit');
        }
    })

    l_xAutcomplete.data('autocomplete')._renderItem = function(ul, item) {
        return $(_.template($('#cwmap_autocomplete_li_template').html(), {item: item})).data("item.autocomplete", item).appendTo(ul);
    };


    l_xAutcomplete.data('autocomplete')._renderMenu = function( ul, items ) {
        $(items).each(function(index, item) {
            var stripHtml = $('<p></p>')
            stripHtml.html(item.deployment_code)
            item.value = stripHtml.text();
        });
        ul.addClass('cwmap-ui-autocomplete');
        if(items.length > 1) {
            ul.append(_.template($('#cwmap_autocomplete_header_template').html()));
        }
        var self = this;
        $.each( items, function( index, item ) {
            self._renderItem( ul, item );
        });
    }
}

CWMAP.prototype.initFormSubmitHandler = function() {
    this_cwmap = this;

    $(this.selectors['search_form']).submit(function(e) {
        e.preventDefault();
        $('ui-autocomplete').hide();
        if($(this_cwmap.selectors['autocomplete_input'] + ".ui-autocomplete-input").length > 0) {
            $(this_cwmap.selectors['autocomplete_input']).autocomplete("destroy") // This was the only reliable way to make sure the autocomplete menu closes
        }

        var form_data = $(this_cwmap.selectors['search_form']).serialize()
        var search_val = $(this_cwmap.selectors['search_input']).val()

        $.ajax({
            type: 'post',
            url: this_cwmap.search_url,
            data: form_data,
            dataType: 'jsonp',
            success: function(data, textStatus, jqXHR) {
                this_cwmap.updateMap(data.projects)
                this_cwmap.search_id = data.search_id
                if($(location).attr('hash') == '#'+data.search_id) {
                    $(this_cwmap.selectors['search_input']).val(data.search_term)
                }
                $(this_cwmap.selectors['search_id_input']).val('')
                var map_count_html = 'SEARCH RESULTS: <span class="number">' + (data.projects.length).toString() + '</span> <span>' + (data.projects.length == 1 ? 'PROJECT' : 'PROJECTS') + ' FOUND</span>';
                $(this_cwmap.selectors['search_results']).html(map_count_html)
                $(this_cwmap.selectors['search_results']+'>span.number').format({format: "00,000"})
                this_cwmap.initAutoComplete()
                $(this_cwmap).trigger('searchCompleted', [data.projects, ]);
            },
            error: function(e) {
                // alert('Error!') // Do something better?
            },
            beforeSend: function(xhr) {
                if(this_cwmap.first_search) {
                    this_cwmap.first_search = false; // Do not track the first search, it's always auto submitted as soon as the page loads
                } else {
                    if(typeof _gaq  != 'undefined') _gaq.push(['_trackEvent', 'Maps', 'Search', search_val.toLowerCase()]);
                }
            }
        });
    });
}

CWMAP.prototype.addMarker = function(lat, lng, url, icon) {
    latlng = new google.maps.LatLng(lat, lng);
    var marker = new google.maps.Marker({
        position: latlng,
        icon: icon
    });
    this.markers.push(marker);
    var currentMarkerCount = this.markers.length
    marker.url = url;

    this.latlngbounds.extend(latlng);

    if(url.length > 0) {
        this_cwmap = this;
        if($.inArray(CWMAP.disable_infowindows, this.functionality) == -1) {
            google.maps.event.addListener(marker, 'click', function() {
                if(this_cwmap.infobox) {
                    this_cwmap.infobox.close();
                    this_cwmap.infobox = null;
                }
                if(this_cwmap.infoboxMarker == marker) {
                    this_cwmap.infoboxMarker = null;
                    return; // toggle open/close this marker
                }

                $(this_cwmap).trigger('markerClicked', [currentMarkerCount, ]);
                if(typeof _gaq  != 'undefined') _gaq.push(['_trackEvent', 'Maps', 'Infowindow_View', url.split('/').pop()]);
                $.ajax({
                    type: 'get',
                    dataType: "jsonp",
                    url: url,
                    error: function(xhr,errorType, z) {
                    },
                    success: function(data) {
                        this_cwmap.infoboxMarker = marker;

                        var info_box_clearance = [50, 60];

                        if($(this_cwmap.selectors['search_bar']).is(':visible')) {
                            info_box_clearance[1] = info_box_clearance[1] + $(this_cwmap.selectors['search_bar']).height();
                        }

                        l_xPixelOffset = new google.maps.Size(-335, -23);
                        if(this_cwmap.rig_map) {
                            l_xPixelOffset = new google.maps.Size(-123, -30);
                        }

                        this_cwmap.infobox = new InfoBox({
                            content: data,
                            alignBottom: true,
                            infoBoxClearance: new google.maps.Size(info_box_clearance[0], info_box_clearance[1]),
                            pixelOffset: l_xPixelOffset,
                            // closeBoxURL: 'images/infobox_close.png',
                            closeBoxMargin: '-10000px'
                        });

                        this_cwmap.infobox.open(this_cwmap.map, marker);

                        // The pixeloffset above should've gotten us close, but this will ensure that the infobox is perfectly centered
                        google.maps.event.addListener(this_cwmap.infobox, 'domready', function() {
                            this_cwmap.infobox.setOptions({ pixelOffset: new google.maps.Size(
                                ((-1)*$('.infoBox').width()/2)-2,
                                l_xPixelOffset.height
                            )});
                        });

                        google.maps.event.addListener(this_cwmap.infobox, 'domready', function() {
                            $('div.close-button').click(function() {
                                this_cwmap.infobox.close()
                                this_cwmap.infobox = null;
                            })
                        })
                    }
                });
            });
        }
    }
};

CWMAP.prototype.addPath = function(p_aPath) {
    var this_cwmap = this;

    // Turn array of x,y coords into lat lng points, add markers to map
    var l_aPath = $(p_aPath).map(function(l_nIndex, l_aPoint) {
        var ret_xLatLng = new google.maps.LatLng(l_aPoint[0], l_aPoint[1])
        if(l_nIndex != p_aPath.length-1) { // don't add a marker for the last data point
            this_cwmap.addPathMarker(ret_xLatLng, _.template($('#cwmap_path_infobox_template').html(), {
                'location': l_aPoint[2],
                'date': l_aPoint[3],
                'days': l_aPoint[4] > 1 ? sprintf("(%s Days)", l_aPoint[4]) : '',
                'notes': l_aPoint[5] == null ? '' : '<hr />'+l_aPoint[5]
            }))
        }
        return ret_xLatLng
    })
    // Extend the map bounds to ensure that the entire line is contained
    // $(l_aPath).each(function(l_nIndex, l_aPoint) {
        // this_cwmap.latlngbounds.extend(l_aPoint)
    // })

    var l_xPoly = new google.maps.Polyline({
        path: l_aPath,
        strokeColor: '#52A2FF',
        strokeOpacity: 1,
        strokeWeigth: 3,
        map: this.map
    });
}

CWMAP.prototype.addPathMarker = function(p_xLatLng, p_sContent) {
    this_cwmap = this;

    var l_xMarker = new google.maps.Marker({
        position: p_xLatLng,
        map: this_cwmap.map,
        icon: new google.maps.MarkerImage(this.path_marker_image_url, null, null, new google.maps.Point(6, 6), new google.maps.Size(11, 11))
    });
    this_cwmap.path_markers.push(l_xMarker);

    google.maps.event.addListener(l_xMarker, 'click', function() {
        if(this_cwmap.infobox) {
            this_cwmap.infobox.close();
            this_cwmap.infobox = null;
        }
        if(this_cwmap.infoboxMarker == l_xMarker) {
            this_cwmap.infoboxMarker = null;
            return; // toggle open/close this marker
        }
        this_cwmap.infoboxMarker = l_xMarker

        var info_box_clearance = [50, 60];

        if($(this_cwmap.selectors['search_bar']).is(':visible')) {
            info_box_clearance[1] = info_box_clearance[1] + $(this_cwmap.selectors['search_bar']).height();
        }

        l_xPixelOffset = new google.maps.Size(-139, -7);
        this_cwmap.infobox = new InfoBox({
            content: p_sContent,
            alignBottom: true,
            infoBoxClearance: new google.maps.Size(info_box_clearance[0], info_box_clearance[1]),
            pixelOffset: l_xPixelOffset,
            // closeBoxURL: 'images/infobox_close.png',
            closeBoxMargin: '-10000px'
        });

        this_cwmap.infobox.open(this_cwmap.map, l_xMarker);

        // The pixeloffset above should've gotten us close, but this will ensure that the infobox is perfectly centered
        google.maps.event.addListener(this_cwmap.infobox, 'domready', function() {
            this_cwmap.infobox.setOptions({ pixelOffset: new google.maps.Size(
                ((-1)*$('.infoBox').width()/2)-2,
                l_xPixelOffset.height
            )});
        });

        google.maps.event.addListener(this_cwmap.infobox, 'domready', function() {
            $('div.close-button').click(function() {
                this_cwmap.infobox.close()
                this_cwmap.infobox = null;
            })
        })
    })
}


CWMAP.prototype.decodeLevels = function(encodedLevelsString) {
    var decodedLevels = [];

    for (var i = 0; i < encodedLevelsString.length; ++i) {
        var level = encodedLevelsString.charCodeAt(i) - 63;
        decodedLevels.push(level);
    }
    return decodedLevels;
}

CWMAP.prototype.getURLParameter = function(name) {
    return decodeURI(
        (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
    );
}

CWMAP.prototype.updateMap = function(projects) {
    this.latlngbounds = new google.maps.LatLngBounds();
    this.projects = projects;
    this.cluster.clearMarkers();
    this.markers = [];
    for(i in this.path_markers) {
        this.path_markers[i].setMap(null);
    }
    this.path_markers = [];
    for(i in this.paths) {
        this.paths[i].setMap(null);
    }
    this.paths = [];

    var project_icon = new google.maps.MarkerImage(this.project_marker_image_url, null, null, new google.maps.Point(15, 31), new google.maps.Size(28, 35));
    var rig_icon = new google.maps.MarkerImage(this.rig_marker_image_url, null, null, new google.maps.Point(15, 33), new google.maps.Size(29, 36));

    for(i in this.projects) {
        if(this.projects[i]) {
            if (typeof this.projects[i]['path'] == 'undefined') {
                // Normal Project or Marker
                this.addMarker(this.projects[i]['latitude'],
                               this.projects[i]['longitude'],
                               this.infobox_base_url+this.projects[i]['id'],
                               project_icon);
            } else {
                // Rig or marker w/path
                this.addMarker(this.projects[i]['latitude'],
                               this.projects[i]['longitude'],
                               this.infobox_base_url+this.projects[i]['id'],
                               rig_icon);
                this.addPath(this.projects[i]['path']);
            }
        }
    }
    this.cluster.addMarkers(this.markers);

    // Position & Zoom Map to ensure that all markers are displayed
    if(this.markers.length > 0) {
        if($.inArray(CWMAP.do_not_auto_zoom, this.functionality) == -1) {
            this.map.fitBounds(this.latlngbounds)
            this_cwmap = this;
            var fitboundslistener = google.maps.event.addListenerOnce(this.map, 'bounds_changed', function(event) {
                this_cwmap.map.setZoom(this_cwmap.map.getZoom()-1);
                this_cwmap.map.setCenter(this_cwmap.latlngbounds.getCenter());
                this_cwmap.maxZoomService.getMaxZoomAtLatLng(this_cwmap.map.getCenter(), function(response) {
                    if (response.status != google.maps.MaxZoomStatus.OK) {
                        // Do nothing if there's an error
                        return;
                    } else {
                        // If we're zoomed in beyond the point where
                        // satellite imagery is available, zoom back out
                        if(response.zoom < this_cwmap.map.zoom) {
                            this_cwmap.map.setZoom(response.zoom)
                        }
                    }
                    this_cwmap.autoOpenInfoBox()
                });
            })
        } else {
            this.map.setCenter(this.latlngbounds.getCenter());
            if(this.rig_map) {
                this.map.setZoom(13);
            } else {
                this.map.setZoom(6);
            }
            this_cwmap.autoOpenInfoBox()
        }
    } else {
        this.map.setCenter(new google.maps.LatLng(0, 0));
        this.map.setZoom(2);
    }

   // Closes the share popup if it's open
   if($(this_cwmap.selectors['map']+'_share').length>0) {
       $(this_cwmap.selectors['share_button']).trigger('click');
   }

   // Close the infowindow if it's open
   if(this.infobox) {
       this.infobox.close();
       this.infobox = null;
   }
};

CWMAP.prototype.autoOpenInfoBox = function() {
    if($.inArray(CWMAP.do_not_auto_open_infowindows, this.functionality) != -1) {
        return;
    }
    if(this.markers.length == 1) {
        google.maps.event.trigger(this.markers[0], 'click');
    }
};

CWMAP.prototype.initMap = function() {
    $(this.selectors['map']).addClass('cwmap');
    var defaultCenter = new google.maps.LatLng(0, 0);
    var mapOptions = {
        zoom: 9,
        maxZoom: 22,
        minZoom: 2,
        scrollwheel: false,
        streetViewControl: false,
        center: defaultCenter,
        disableDefaultUI: true,
        // overviewMapControl: true,
        // overviewMapControlOptions: {opened: false,},
        mapTypeControlOptions: {
            mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.HYBRID, google.maps.MapTypeId.SATELLITE]
        },
        styles: [
                  {
                    featureType: "administrative.country",
                    elementType: "labels",
                    stylers: [
                      { visibility: "off" }
                    ]
                  }
                ]
    };

    this.map = new google.maps.Map(document.getElementById($(this.selectors['map']).attr('id')), mapOptions);
    this.maxZoomService = new google.maps.MaxZoomService();

    this.map.setMapTypeId(google.maps.MapTypeId.SATELLITE);

    var this_cwmap = this;
    google.maps.event.addListener(this.map, 'click', function(event) {
        if(this_cwmap.infobox) {
            this_cwmap.infobox.close();
        }
    })
}

CWMAP.prototype.initTileOverlay = function() {
    this_cwmap = this;
    var tiles = {
        getTileUrl: function(coord, z) {
            if(z < this.minZoom || z > this.maxZoom) {
                return this_cwmap.tiles_base_url + 'blank.gif'
            }
            // Y coordinate is flipped in Mapbox, compared to Google
            var mod = Math.pow(2, z),
            y = (mod - 1) - coord.y;
            x = (coord.x % mod);

            x = (x < 0) ? (coord.x % mod) + mod : x;

            return this_cwmap.tiles_base_url + z + '/' + x + '/' + y + '.png';
        },
        minZoom: 2,
        maxZoom: 9,
        tileSize: new google.maps.Size(256, 256)
    }

    this.map.overlayMapTypes.insertAt(0, new google.maps.ImageMapType(tiles));

    var this_cwmap = this;
    var setOpacity = function(event) {
        var opacity = 1 - (this_cwmap.map.getZoom() - tiles.minZoom) / (tiles.maxZoom - tiles.minZoom)
        opacity = opacity > 1 ? 1 : opacity;
        opacity = .90 * opacity;
        $(this_cwmap.selectors['map'] + ' img[src^="//maptiles"]').css('opacity', opacity)
    }

    google.maps.event.addListener(this.map, 'zoom_changed', setOpacity);
    google.maps.event.addListener(this.map, 'bounds_changed', setOpacity);
    google.maps.event.addListener(this.map, 'tilesloaded', setOpacity);

    // Make sure the opacity gets set on the initial map loading
    var loadedListener = google.maps.event.addListener(this.map, 'tilesloaded', function(event) {
        $(this_cwmap.selectors['search_input']).placeholder();
        google.maps.event.removeListener(loadedListener);
    });
};

CWMAP.prototype.search = function(p_sSearchTerm) {
    $(this.selectors['search_input']).val(p_sSearchTerm);
    $(this.selectors['search_form']).submit();
};

CWMAP.prototype.getId = function(p_sSelector) {
    return this.selectors[p_sSelector].replace(/^#/, '')
};

/* Various Plugins, etc used by cwmap.js */

/*
 * jQuery UI Autocomplete HTML Extension
 *
 * Copyright 2010, Scott González (http://scottgonzalez.com)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * http://github.com/scottgonzalez/jquery-ui-extensions
 */
(function( $ ) {

var proto = $.ui.autocomplete.prototype,
    initSource = proto._initSource;

function filter( array, term ) {
    var matcher = new RegExp( $.ui.autocomplete.escapeRegex(term), "i" );
    return $.grep( array, function(value) {
        return matcher.test( $( "<div>" ).html( value.label || value.value || value ).text() );
    });
}

$.extend( proto, {
    _initSource: function() {
        if ( this.options.html && $.isArray(this.options.source) ) {
            this.source = function( request, response ) {
                response( filter( this.options.source, request.term ) );
            };
        } else {
            initSource.call( this );
        }
    },

    _renderItem: function( ul, item) {
        return $( "<li></li>" )
            .data( "item.autocomplete", item )
            .append( $( "<a></a>" )[ this.options.html ? "html" : "text" ]( item.label ) )
            .appendTo( ul );
    }
});

})( jQuery );


// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @externs_url http://closure-compiler.googlecode.com/svn/trunk/contrib/externs/maps/google_maps_api_v3_3.js
// ==/ClosureCompiler==

/**
 * @name MarkerClusterer for Google Maps v3
 * @version version 1.0
 * @author Luke Mahe
 * @fileoverview
 * The library creates and manages per-zoom-level clusters for large amounts of
 * markers.
 * <br/>
 * This is a v3 implementation of the
 * <a href="http://gmaps-utility-library-dev.googlecode.com/svn/tags/markerclusterer/"
 * >v2 MarkerClusterer</a>.
 */

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * A Marker Clusterer that clusters markers.
 *
 * @param {google.maps.Map} map The Google map to attach to.
 * @param {Array.<google.maps.Marker>=} opt_markers Optional markers to add to
 *   the cluster.
 * @param {Object=} opt_options support the following options:
 *     'gridSize': (number) The grid size of a cluster in pixels.
 *     'maxZoom': (number) The maximum zoom level that a marker can be part of a
 *                cluster.
 *     'zoomOnClick': (boolean) Whether the default behaviour of clicking on a
 *                    cluster is to zoom into it.
 *     'averageCenter': (boolean) Wether the center of each cluster should be
 *                      the average of all markers in the cluster.
 *     'minimumClusterSize': (number) The minimum number of markers to be in a
 *                           cluster before the markers are hidden and a count
 *                           is shown.
 *     'styles': (object) An object that has style properties:
 *       'url': (string) The image url.
 *       'height': (number) The image height.
 *       'width': (number) The image width.
 *       'anchor': (Array) The anchor position of the label text.
 *       'textColor': (string) The text color.
 *       'textSize': (number) The text size.
 *       'backgroundPosition': (string) The position of the backgound x, y.
 *       'xOffset': (number) Pixels from center to offset the marker by.
 *       'yOffset': (number) Pixesls from center to offset the marker by.
 * @constructor
 * @extends google.maps.OverlayView
 */
function MarkerClusterer(map, opt_markers, opt_options) {
  // MarkerClusterer implements google.maps.OverlayView interface. We use the
  // extend function to extend MarkerClusterer with google.maps.OverlayView
  // because it might not always be available when the code is defined so we
  // look for it at the last possible moment. If it doesn't exist now then
  // there is no point going ahead :)
  this.extend(MarkerClusterer, google.maps.OverlayView);
  this.map_ = map;

  /**
   * @type {Array.<google.maps.Marker>}
   * @private
   */
  this.markers_ = [];

  /**
   *  @type {Array.<Cluster>}
   */
  this.clusters_ = [];

  this.sizes = [53, 56, 66, 78, 90];

  /**
   * @private
   */
  this.styles_ = [];

  /**
   * @type {boolean}
   * @private
   */
  this.ready_ = false;

  var options = opt_options || {};

  /**
   * @type {number}
   * @private
   */
  this.gridSize_ = options['gridSize'] || 60;

  /**
   * @private
   */
  this.minClusterSize_ = options['minimumClusterSize'] || 2;


  /**
   * @type {?number}
   * @private
   */
  this.maxZoom_ = options['maxZoom'] || null;

  this.styles_ = options['styles'] || [];

  /**
   * @type {string}
   * @private
   */
  this.imagePath_ = options['imagePath'] ||
      this.MARKER_CLUSTER_IMAGE_PATH_;

  /**
   * @type {string}
   * @private
   */
  this.imageExtension_ = options['imageExtension'] ||
      this.MARKER_CLUSTER_IMAGE_EXTENSION_;

  /**
   * @type {boolean}
   * @private
   */
  this.zoomOnClick_ = true;

  if (options['zoomOnClick'] != undefined) {
    this.zoomOnClick_ = options['zoomOnClick'];
  }

  /**
   * @type {boolean}
   * @private
   */
  this.averageCenter_ = false;

  if (options['averageCenter'] != undefined) {
    this.averageCenter_ = options['averageCenter'];
  }

  this.setupStyles_();

  this.setMap(map);

  /**
   * @type {number}
   * @private
   */
  this.prevZoom_ = this.map_.getZoom();

  // Add the map event listeners
  var that = this;
  google.maps.event.addListener(this.map_, 'zoom_changed', function() {
    var maxZoom = that.map_.maxZoom;
    var zoom = that.map_.getZoom();
    if (zoom < 0 || zoom > maxZoom) {
      return;
    }

    if (that.prevZoom_ != zoom) {
      that.prevZoom_ = that.map_.getZoom();
      that.resetViewport();
    }
  });

  google.maps.event.addListener(this.map_, 'idle', function() {
    that.redraw();
  });

  // Finally, add the markers
  if (opt_markers && opt_markers.length) {
    this.addMarkers(opt_markers, false);
  }
}


/**
 * The marker cluster image path.
 *
 * @type {string}
 * @private
 */
MarkerClusterer.prototype.MARKER_CLUSTER_IMAGE_PATH_ =
    'http://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclusterer/' +
    'images/m';


/**
 * The marker cluster image path.
 *
 * @type {string}
 * @private
 */
MarkerClusterer.prototype.MARKER_CLUSTER_IMAGE_EXTENSION_ = 'png';


/**
 * Extends a objects prototype by anothers.
 *
 * @param {Object} obj1 The object to be extended.
 * @param {Object} obj2 The object to extend with.
 * @return {Object} The new extended object.
 * @ignore
 */
MarkerClusterer.prototype.extend = function(obj1, obj2) {
  return (function(object) {
    for (var property in object.prototype) {
      this.prototype[property] = object.prototype[property];
    }
    return this;
  }).apply(obj1, [obj2]);
};


/**
 * Implementaion of the interface method.
 * @ignore
 */
MarkerClusterer.prototype.onAdd = function() {
  this.setReady_(true);
};

/**
 * Implementaion of the interface method.
 * @ignore
 */
MarkerClusterer.prototype.draw = function() {};

/**
 * Sets up the styles object.
 *
 * @private
 */
MarkerClusterer.prototype.setupStyles_ = function() {
  if (this.styles_.length) {
    return;
  }

  for (var i = 0, size; size = this.sizes[i]; i++) {
    this.styles_.push({
      url: this.imagePath_ + (i + 1) + '.' + this.imageExtension_,
      height: size,
      width: size
    });
  }
};

/**
 *  Fit the map to the bounds of the markers in the clusterer.
 */
MarkerClusterer.prototype.fitMapToMarkers = function() {
  var markers = this.getMarkers();
  var bounds = new google.maps.LatLngBounds();
  for (var i = 0, marker; marker = markers[i]; i++) {
    bounds.extend(marker.getPosition());
  }

  this.map_.fitBounds(bounds);
};


/**
 *  Sets the styles.
 *
 *  @param {Object} styles The style to set.
 */
MarkerClusterer.prototype.setStyles = function(styles) {
  this.styles_ = styles;
};


/**
 *  Gets the styles.
 *
 *  @return {Object} The styles object.
 */
MarkerClusterer.prototype.getStyles = function() {
  return this.styles_;
};


/**
 * Whether zoom on click is set.
 *
 * @return {boolean} True if zoomOnClick_ is set.
 */
MarkerClusterer.prototype.isZoomOnClick = function() {
  return this.zoomOnClick_;
};

/**
 * Whether average center is set.
 *
 * @return {boolean} True if averageCenter_ is set.
 */
MarkerClusterer.prototype.isAverageCenter = function() {
  return this.averageCenter_;
};


/**
 *  Returns the array of markers in the clusterer.
 *
 *  @return {Array.<google.maps.Marker>} The markers.
 */
MarkerClusterer.prototype.getMarkers = function() {
  return this.markers_;
};


/**
 *  Returns the number of markers in the clusterer
 *
 *  @return {Number} The number of markers.
 */
MarkerClusterer.prototype.getTotalMarkers = function() {
  return this.markers_.length;
};


/**
 *  Sets the max zoom for the clusterer.
 *
 *  @param {number} maxZoom The max zoom level.
 */
MarkerClusterer.prototype.setMaxZoom = function(maxZoom) {
  this.maxZoom_ = maxZoom;
};


/**
 *  Gets the max zoom for the clusterer.
 *
 *  @return {number} The max zoom level.
 */
MarkerClusterer.prototype.getMaxZoom = function() {
  return this.maxZoom_ || this.map_.mapTypes[this.map_.getMapTypeId()].maxZoom;
};


/**
 *  The function for calculating the cluster icon image.
 *
 *  @param {Array.<google.maps.Marker>} markers The markers in the clusterer.
 *  @param {number} numStyles The number of styles available.
 *  @return {Object} A object properties: 'text' (string) and 'index' (number).
 *  @private
 */
MarkerClusterer.prototype.calculator_ = function(markers, numStyles) {
  var index = 0;
  var count = markers.length;
  var dv = count;
  while (dv !== 0) {
    dv = parseInt(dv / 10, 10);
    index++;
  }

  index = Math.min(index, numStyles);
  return {
    text: count,
    index: index
  };
};


/**
 * Set the calculator function.
 *
 * @param {function(Array, number)} calculator The function to set as the
 *     calculator. The function should return a object properties:
 *     'text' (string) and 'index' (number).
 *
 */
MarkerClusterer.prototype.setCalculator = function(calculator) {
  this.calculator_ = calculator;
};


/**
 * Get the calculator function.
 *
 * @return {function(Array, number)} the calculator function.
 */
MarkerClusterer.prototype.getCalculator = function() {
  return this.calculator_;
};


/**
 * Add an array of markers to the clusterer.
 *
 * @param {Array.<google.maps.Marker>} markers The markers to add.
 * @param {boolean=} opt_nodraw Whether to redraw the clusters.
 */
MarkerClusterer.prototype.addMarkers = function(markers, opt_nodraw) {
  for (var i = 0, marker; marker = markers[i]; i++) {
    this.pushMarkerTo_(marker);
  }
  if (!opt_nodraw) {
    this.redraw();
  }
};


/**
 * Pushes a marker to the clusterer.
 *
 * @param {google.maps.Marker} marker The marker to add.
 * @private
 */
MarkerClusterer.prototype.pushMarkerTo_ = function(marker) {
  marker.isAdded = false;
  if (marker['draggable']) {
    // If the marker is draggable add a listener so we update the clusters on
    // the drag end.
    var that = this;
    google.maps.event.addListener(marker, 'dragend', function() {
      marker.isAdded = false;
      that.repaint();
    });
  }
  this.markers_.push(marker);
};


/**
 * Adds a marker to the clusterer and redraws if needed.
 *
 * @param {google.maps.Marker} marker The marker to add.
 * @param {boolean=} opt_nodraw Whether to redraw the clusters.
 */
MarkerClusterer.prototype.addMarker = function(marker, opt_nodraw) {
  this.pushMarkerTo_(marker);
  if (!opt_nodraw) {
    this.redraw();
  }
};


/**
 * Removes a marker and returns true if removed, false if not
 *
 * @param {google.maps.Marker} marker The marker to remove
 * @return {boolean} Whether the marker was removed or not
 * @private
 */
MarkerClusterer.prototype.removeMarker_ = function(marker) {
  var index = -1;
  if (this.markers_.indexOf) {
    index = this.markers_.indexOf(marker);
  } else {
    for (var i = 0, m; m = this.markers_[i]; i++) {
      if (m == marker) {
        index = i;
        break;
      }
    }
  }

  if (index == -1) {
    // Marker is not in our list of markers.
    return false;
  }

  marker.setMap(null);

  this.markers_.splice(index, 1);

  return true;
};


/**
 * Remove a marker from the cluster.
 *
 * @param {google.maps.Marker} marker The marker to remove.
 * @param {boolean=} opt_nodraw Optional boolean to force no redraw.
 * @return {boolean} True if the marker was removed.
 */
MarkerClusterer.prototype.removeMarker = function(marker, opt_nodraw) {
  var removed = this.removeMarker_(marker);

  if (!opt_nodraw && removed) {
    this.resetViewport();
    this.redraw();
    return true;
  } else {
   return false;
  }
};


/**
 * Removes an array of markers from the cluster.
 *
 * @param {Array.<google.maps.Marker>} markers The markers to remove.
 * @param {boolean=} opt_nodraw Optional boolean to force no redraw.
 */
MarkerClusterer.prototype.removeMarkers = function(markers, opt_nodraw) {
  var removed = false;

  for (var i = 0, marker; marker = markers[i]; i++) {
    var r = this.removeMarker_(marker);
    removed = removed || r;
  }

  if (!opt_nodraw && removed) {
    this.resetViewport();
    this.redraw();
    return true;
  }
};


/**
 * Sets the clusterer's ready state.
 *
 * @param {boolean} ready The state.
 * @private
 */
MarkerClusterer.prototype.setReady_ = function(ready) {
  if (!this.ready_) {
    this.ready_ = ready;
    this.createClusters_();
  }
};


/**
 * Returns the number of clusters in the clusterer.
 *
 * @return {number} The number of clusters.
 */
MarkerClusterer.prototype.getTotalClusters = function() {
  return this.clusters_.length;
};


/**
 * Returns the google map that the clusterer is associated with.
 *
 * @return {google.maps.Map} The map.
 */
MarkerClusterer.prototype.getMap = function() {
  return this.map_;
};


/**
 * Sets the google map that the clusterer is associated with.
 *
 * @param {google.maps.Map} map The map.
 */
MarkerClusterer.prototype.setMap = function(map) {
  this.map_ = map;
};


/**
 * Returns the size of the grid.
 *
 * @return {number} The grid size.
 */
MarkerClusterer.prototype.getGridSize = function() {
  return this.gridSize_;
};


/**
 * Sets the size of the grid.
 *
 * @param {number} size The grid size.
 */
MarkerClusterer.prototype.setGridSize = function(size) {
  this.gridSize_ = size;
};


/**
 * Returns the min cluster size.
 *
 * @return {number} The grid size.
 */
MarkerClusterer.prototype.getMinClusterSize = function() {
  return this.minClusterSize_;
};

/**
 * Sets the min cluster size.
 *
 * @param {number} size The grid size.
 */
MarkerClusterer.prototype.setMinClusterSize = function(size) {
  this.minClusterSize_ = size;
};


/**
 * Extends a bounds object by the grid size.
 *
 * @param {google.maps.LatLngBounds} bounds The bounds to extend.
 * @return {google.maps.LatLngBounds} The extended bounds.
 */
MarkerClusterer.prototype.getExtendedBounds = function(bounds) {
  var projection = this.getProjection();

  // Turn the bounds into latlng.
  var tr = new google.maps.LatLng(bounds.getNorthEast().lat(),
      bounds.getNorthEast().lng());
  var bl = new google.maps.LatLng(bounds.getSouthWest().lat(),
      bounds.getSouthWest().lng());

  // Convert the points to pixels and the extend out by the grid size.
  var trPix = projection.fromLatLngToDivPixel(tr);
  trPix.x += this.gridSize_;
  trPix.y -= this.gridSize_;

  var blPix = projection.fromLatLngToDivPixel(bl);
  blPix.x -= this.gridSize_;
  blPix.y += this.gridSize_;

  // Convert the pixel points back to LatLng
  var ne = projection.fromDivPixelToLatLng(trPix);
  var sw = projection.fromDivPixelToLatLng(blPix);

  // Extend the bounds to contain the new bounds.
  bounds.extend(ne);
  bounds.extend(sw);

  return bounds;
};


/**
 * Determins if a marker is contained in a bounds.
 *
 * @param {google.maps.Marker} marker The marker to check.
 * @param {google.maps.LatLngBounds} bounds The bounds to check against.
 * @return {boolean} True if the marker is in the bounds.
 * @private
 */
MarkerClusterer.prototype.isMarkerInBounds_ = function(marker, bounds) {
  return bounds.contains(marker.getPosition());
};


/**
 * Clears all clusters and markers from the clusterer.
 */
MarkerClusterer.prototype.clearMarkers = function() {
  this.resetViewport(true);

  // Set the markers a empty array.
  this.markers_ = [];
};


/**
 * Clears all existing clusters and recreates them.
 * @param {boolean} opt_hide To also hide the marker.
 */
MarkerClusterer.prototype.resetViewport = function(opt_hide) {
  // Remove all the clusters
  for (var i = 0, cluster; cluster = this.clusters_[i]; i++) {
    cluster.remove();
  }

  // Reset the markers to not be added and to be invisible.
  for (var i = 0, marker; marker = this.markers_[i]; i++) {
    marker.isAdded = false;
    if (opt_hide) {
      marker.setMap(null);
    }
  }

  this.clusters_ = [];
};

/**
 *
 */
MarkerClusterer.prototype.repaint = function() {
  var oldClusters = this.clusters_.slice();
  this.clusters_.length = 0;
  this.resetViewport();
  this.redraw();

  // Remove the old clusters.
  // Do it in a timeout so the other clusters have been drawn first.
  window.setTimeout(function() {
    for (var i = 0, cluster; cluster = oldClusters[i]; i++) {
      cluster.remove();
    }
  }, 0);
};


/**
 * Redraws the clusters.
 */
MarkerClusterer.prototype.redraw = function() {
  this.createClusters_();
};


/**
 * Calculates the distance between two latlng locations in km.
 * @see http://www.movable-type.co.uk/scripts/latlong.html
 *
 * @param {google.maps.LatLng} p1 The first lat lng point.
 * @param {google.maps.LatLng} p2 The second lat lng point.
 * @return {number} The distance between the two points in km.
 * @private
*/
MarkerClusterer.prototype.distanceBetweenPoints_ = function(p1, p2) {
  if (!p1 || !p2) {
    return 0;
  }

  var R = 6371; // Radius of the Earth in km
  var dLat = (p2.lat() - p1.lat()) * Math.PI / 180;
  var dLon = (p2.lng() - p1.lng()) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat() * Math.PI / 180) * Math.cos(p2.lat() * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d;
};


/**
 * Add a marker to a cluster, or creates a new cluster.
 *
 * @param {google.maps.Marker} marker The marker to add.
 * @private
 */
MarkerClusterer.prototype.addToClosestCluster_ = function(marker) {
  var distance = 40000; // Some large number
  var clusterToAddTo = null;
  var pos = marker.getPosition();
  for (var i = 0, cluster; cluster = this.clusters_[i]; i++) {
    var center = cluster.getCenter();
    if (center) {
      var d = this.distanceBetweenPoints_(center, marker.getPosition());
      if (d < distance) {
        distance = d;
        clusterToAddTo = cluster;
      }
    }
  }

  if (clusterToAddTo && clusterToAddTo.isMarkerInClusterBounds(marker)) {
    clusterToAddTo.addMarker(marker);
  } else {
    var cluster = new Cluster(this);
    cluster.addMarker(marker);
    this.clusters_.push(cluster);
  }
};


/**
 * Creates the clusters.
 *
 * @private
 */
MarkerClusterer.prototype.createClusters_ = function() {
  if (!this.ready_) {
    return;
  }

  // Get our current map view bounds.
  // Create a new bounds object so we don't affect the map.
  var mapBounds = new google.maps.LatLngBounds(this.map_.getBounds().getSouthWest(),
      this.map_.getBounds().getNorthEast());
  var bounds = this.getExtendedBounds(mapBounds);

  for (var i = 0, marker; marker = this.markers_[i]; i++) {
    if (!marker.isAdded && (this.isMarkerInBounds_(marker, bounds) || this.map_.zoom <= 3)) {
      this.addToClosestCluster_(marker);
    }
  }
};


/**
 * A cluster that contains markers.
 *
 * @param {MarkerClusterer} markerClusterer The markerclusterer that this
 *     cluster is associated with.
 * @constructor
 * @ignore
 */
function Cluster(markerClusterer) {
  this.markerClusterer_ = markerClusterer;
  this.map_ = markerClusterer.getMap();
  this.gridSize_ = markerClusterer.getGridSize();
  this.minClusterSize_ = markerClusterer.getMinClusterSize();
  this.averageCenter_ = markerClusterer.isAverageCenter();
  this.center_ = null;
  this.markers_ = [];
  this.bounds_ = null;
  this.clusterIcon_ = new ClusterIcon(this, markerClusterer.getStyles(),
      markerClusterer.getGridSize());
}

/**
 * Determins if a marker is already added to the cluster.
 *
 * @param {google.maps.Marker} marker The marker to check.
 * @return {boolean} True if the marker is already added.
 */
Cluster.prototype.isMarkerAlreadyAdded = function(marker) {
  if (this.markers_.indexOf) {
    return this.markers_.indexOf(marker) != -1;
  } else {
    for (var i = 0, m; m = this.markers_[i]; i++) {
      if (m == marker) {
        return true;
      }
    }
  }
  return false;
};


/**
 * Add a marker the cluster.
 *
 * @param {google.maps.Marker} marker The marker to add.
 * @return {boolean} True if the marker was added.
 */
Cluster.prototype.addMarker = function(marker) {
  if (this.isMarkerAlreadyAdded(marker)) {
    return false;
  }

  if (!this.center_) {
    this.center_ = marker.getPosition();
    this.calculateBounds_();
  } else {
    if (this.averageCenter_) {
      var l = this.markers_.length + 1;
      var lat = (this.center_.lat() * (l-1) + marker.getPosition().lat()) / l;
      var lng = (this.center_.lng() * (l-1) + marker.getPosition().lng()) / l;
      this.center_ = new google.maps.LatLng(lat, lng);
      this.calculateBounds_();
    }
  }

  marker.isAdded = true;
  this.markers_.push(marker);

  var len = this.markers_.length;
  if (len < this.minClusterSize_ && marker.getMap() != this.map_) {
    // Min cluster size not reached so show the marker.
    marker.setMap(this.map_);
  }

  if (len == this.minClusterSize_) {
    // Hide the markers that were showing.
    for (var i = 0; i < len; i++) {
      this.markers_[i].setMap(null);
    }
  }

  if (len >= this.minClusterSize_) {
    marker.setMap(null);
  }

  this.updateIcon();
  return true;
};


/**
 * Returns the marker clusterer that the cluster is associated with.
 *
 * @return {MarkerClusterer} The associated marker clusterer.
 */
Cluster.prototype.getMarkerClusterer = function() {
  return this.markerClusterer_;
};


/**
 * Returns the bounds of the cluster.
 *
 * @return {google.maps.LatLngBounds} the cluster bounds.
 */
Cluster.prototype.getBounds = function() {
  var bounds = new google.maps.LatLngBounds(this.center_, this.center_);
  var markers = this.getMarkers();
  for (var i = 0, marker; marker = markers[i]; i++) {
    bounds.extend(marker.getPosition());
  }
  return bounds;
};


/**
 * Removes the cluster
 */
Cluster.prototype.remove = function() {
  this.clusterIcon_.remove();
  this.markers_.length = 0;
  delete this.markers_;
};


/**
 * Returns the center of the cluster.
 *
 * @return {number} The cluster center.
 */
Cluster.prototype.getSize = function() {
  return this.markers_.length;
};


/**
 * Returns the center of the cluster.
 *
 * @return {Array.<google.maps.Marker>} The cluster center.
 */
Cluster.prototype.getMarkers = function() {
  return this.markers_;
};


/**
 * Returns the center of the cluster.
 *
 * @return {google.maps.LatLng} The cluster center.
 */
Cluster.prototype.getCenter = function() {
  return this.center_;
};


/**
 * Calculated the extended bounds of the cluster with the grid.
 *
 * @private
 */
Cluster.prototype.calculateBounds_ = function() {
  var bounds = new google.maps.LatLngBounds(this.center_, this.center_);
  this.bounds_ = this.markerClusterer_.getExtendedBounds(bounds);
};


/**
 * Determines if a marker lies in the clusters bounds.
 *
 * @param {google.maps.Marker} marker The marker to check.
 * @return {boolean} True if the marker lies in the bounds.
 */
Cluster.prototype.isMarkerInClusterBounds = function(marker) {
  return this.bounds_.contains(marker.getPosition());
};


/**
 * Returns the map that the cluster is associated with.
 *
 * @return {google.maps.Map} The map.
 */
Cluster.prototype.getMap = function() {
  return this.map_;
};


/**
 * Updates the cluster icon
 */
Cluster.prototype.updateIcon = function() {
  var zoom = this.map_.getZoom();
  var mz = this.markerClusterer_.getMaxZoom();

  if (zoom > mz) {
    // The zoom is greater than our max zoom so show all the markers in cluster.
    for (var i = 0, marker; marker = this.markers_[i]; i++) {
      marker.setMap(this.map_);
    }
    return;
  }

  if (this.markers_.length < this.minClusterSize_) {
    // Min cluster size not yet reached.
    this.clusterIcon_.hide();
    return;
  }

  var numStyles = this.markerClusterer_.getStyles().length;
  var sums = this.markerClusterer_.getCalculator()(this.markers_, numStyles);
  this.clusterIcon_.setCenter(this.center_);
  this.clusterIcon_.setSums(sums);
  this.clusterIcon_.show();
};


/**
 * A cluster icon
 *
 * @param {Cluster} cluster The cluster to be associated with.
 * @param {Object} styles An object that has style properties:
 *     'url': (string) The image url.
 *     'height': (number) The image height.
 *     'width': (number) The image width.
 *     'anchor': (Array) The anchor position of the label text.
 *     'textColor': (string) The text color.
 *     'textSize': (number) The text size.
 *     'backgroundPosition: (string) The background postition x, y.
 *     'xOffset'
 *     'yOffset'
 * @param {number=} opt_padding Optional padding to apply to the cluster icon.
 * @constructor
 * @extends google.maps.OverlayView
 * @ignore
 */
function ClusterIcon(cluster, styles, opt_padding) {
  cluster.getMarkerClusterer().extend(ClusterIcon, google.maps.OverlayView);

  this.styles_ = styles;
  this.padding_ = opt_padding || 0;
  this.cluster_ = cluster;
  this.center_ = null;
  this.map_ = cluster.getMap();
  this.div_ = null;
  this.sums_ = null;
  this.visible_ = false;

  this.setMap(this.map_);
}


/**
 * Triggers the clusterclick event and zoom's if the option is set.
 */
ClusterIcon.prototype.triggerClusterClick = function() {
  var markerClusterer = this.cluster_.getMarkerClusterer();

  // Trigger the clusterclick event.
  google.maps.event.trigger(markerClusterer, 'clusterclick', this.cluster_);

  if (markerClusterer.isZoomOnClick()) {
    // Zoom into the cluster.
    this.map_.fitBounds(this.cluster_.getBounds());
  }
};


/**
 * Adding the cluster icon to the dom.
 * @ignore
 */
ClusterIcon.prototype.onAdd = function() {
  this.div_ = document.createElement('DIV');
  if (this.visible_) {
    var pos = this.getPosFromLatLng_(this.center_);
    this.div_.style.cssText = this.createCss(pos);
    this.div_.innerHTML = this.sums_.text;
  }

  var panes = this.getPanes();
  panes.overlayMouseTarget.appendChild(this.div_);

  var that = this;
  google.maps.event.addDomListener(this.div_, 'click', function() {
    that.triggerClusterClick();
  });
};


/**
 * Returns the position to place the div dending on the latlng.
 *
 * @param {google.maps.LatLng} latlng The position in latlng.
 * @return {google.maps.Point} The position in pixels.
 * @private
 */
ClusterIcon.prototype.getPosFromLatLng_ = function(latlng) {
  var pos = this.getProjection().fromLatLngToDivPixel(latlng);
  pos.x -= parseInt(this.width_ / 2, 10) + this.xOffset;
  pos.y -= parseInt(this.height_ / 2, 10) + this.yOffset;
  return pos;
};


/**
 * Draw the icon.
 * @ignore
 */
ClusterIcon.prototype.draw = function() {
  if (this.visible_) {
    var pos = this.getPosFromLatLng_(this.center_);
    this.div_.style.top = pos.y + 'px';
    this.div_.style.left = pos.x + 'px';
  }
};


/**
 * Hide the icon.
 */
ClusterIcon.prototype.hide = function() {
  if (this.div_) {
    this.div_.style.display = 'none';
  }
  this.visible_ = false;
};


/**
 * Position and show the icon.
 */
ClusterIcon.prototype.show = function() {
  if (this.div_) {
    var pos = this.getPosFromLatLng_(this.center_);
    this.div_.style.cssText = this.createCss(pos);
    this.div_.style.display = '';
  }
  this.visible_ = true;
};


/**
 * Remove the icon from the map
 */
ClusterIcon.prototype.remove = function() {
  this.setMap(null);
};


/**
 * Implementation of the onRemove interface.
 * @ignore
 */
ClusterIcon.prototype.onRemove = function() {
  if (this.div_ && this.div_.parentNode) {
    this.hide();
    this.div_.parentNode.removeChild(this.div_);
    this.div_ = null;
  }
};


/**
 * Set the sums of the icon.
 *
 * @param {Object} sums The sums containing:
 *   'text': (string) The text to display in the icon.
 *   'index': (number) The style index of the icon.
 */
ClusterIcon.prototype.setSums = function(sums) {
  this.sums_ = sums;
  this.text_ = sums.text;
  this.index_ = sums.index;
  if (this.div_) {
    this.div_.innerHTML = sums.text;
  }

  this.useStyle();
};


/**
 * Sets the icon to the the styles.
 */
ClusterIcon.prototype.useStyle = function() {
  var index = Math.max(0, this.sums_.index - 1);
  index = Math.min(this.styles_.length - 1, index);
  var style = this.styles_[index];
  this.url_ = style['url'];
  this.height_ = style['height'];
  this.width_ = style['width'];
  this.textColor_ = style['textColor'];
  this.anchor_ = style['anchor'];
  this.textSize_ = style['textSize'];
  this.backgroundPosition_ = style['backgroundPosition'];
  this.xOffset = style['xOffset'];
  this.yOffset = style['yOffset'];
};


/**
 * Sets the center of the icon.
 *
 * @param {google.maps.LatLng} center The latlng to set as the center.
 */
ClusterIcon.prototype.setCenter = function(center) {
  this.center_ = center;
};


/**
 * Create the css text based on the position of the icon.
 *
 * @param {google.maps.Point} pos The position.
 * @return {string} The css style text.
 */
ClusterIcon.prototype.createCss = function(pos) {
  var style = [];
  style.push('background-image:url(' + this.url_ + ');');
  var backgroundPosition = this.backgroundPosition_ ? this.backgroundPosition_ : '0 0';
  style.push('background-position:' + backgroundPosition + ';');

  if (typeof this.anchor_ === 'object') {
    if (typeof this.anchor_[0] === 'number' && this.anchor_[0] > 0 &&
        this.anchor_[0] < this.height_) {
      style.push('height:' + (this.height_ - this.anchor_[0]) +
          'px; padding-top:' + this.anchor_[0] + 'px;');
    } else {
      style.push('height:' + this.height_ + 'px; line-height:' + this.height_ +
          'px;');
    }
    if (typeof this.anchor_[1] === 'number' && this.anchor_[1] > 0 &&
        this.anchor_[1] < this.width_) {
      style.push('width:' + (this.width_ - this.anchor_[1]) +
          'px; padding-left:' + this.anchor_[1] + 'px;');
    } else {
      style.push('width:' + this.width_ + 'px; text-align:center;');
    }
  } else {
    style.push('height:' + this.height_ + 'px; line-height:' +
        this.height_ + 'px; width:' + this.width_ + 'px; text-align:center;');
  }

  var txtColor = this.textColor_ ? this.textColor_ : 'black';
  var txtSize = this.textSize_ ? this.textSize_ : 11;

  style.push('cursor:pointer; top:' + pos.y + 'px; left:' +
      pos.x + 'px; color:' + txtColor + '; position:absolute; font-size:' +
      txtSize + 'px; font-family:Arial,sans-serif; font-weight:bold');
  return style.join('');
};


// Export Symbols for Closure
// If you are not going to compile with closure then you can remove the
// code below.
window['MarkerClusterer'] = MarkerClusterer;
MarkerClusterer.prototype['addMarker'] = MarkerClusterer.prototype.addMarker;
MarkerClusterer.prototype['addMarkers'] = MarkerClusterer.prototype.addMarkers;
MarkerClusterer.prototype['clearMarkers'] =
    MarkerClusterer.prototype.clearMarkers;
MarkerClusterer.prototype['fitMapToMarkers'] =
    MarkerClusterer.prototype.fitMapToMarkers;
MarkerClusterer.prototype['getCalculator'] =
    MarkerClusterer.prototype.getCalculator;
MarkerClusterer.prototype['getGridSize'] =
    MarkerClusterer.prototype.getGridSize;
MarkerClusterer.prototype['getExtendedBounds'] =
    MarkerClusterer.prototype.getExtendedBounds;
MarkerClusterer.prototype['getMap'] = MarkerClusterer.prototype.getMap;
MarkerClusterer.prototype['getMarkers'] = MarkerClusterer.prototype.getMarkers;
MarkerClusterer.prototype['getMaxZoom'] = MarkerClusterer.prototype.getMaxZoom;
MarkerClusterer.prototype['getStyles'] = MarkerClusterer.prototype.getStyles;
MarkerClusterer.prototype['getTotalClusters'] =
    MarkerClusterer.prototype.getTotalClusters;
MarkerClusterer.prototype['getTotalMarkers'] =
    MarkerClusterer.prototype.getTotalMarkers;
MarkerClusterer.prototype['redraw'] = MarkerClusterer.prototype.redraw;
MarkerClusterer.prototype['removeMarker'] =
    MarkerClusterer.prototype.removeMarker;
MarkerClusterer.prototype['removeMarkers'] =
    MarkerClusterer.prototype.removeMarkers;
MarkerClusterer.prototype['resetViewport'] =
    MarkerClusterer.prototype.resetViewport;
MarkerClusterer.prototype['repaint'] =
    MarkerClusterer.prototype.repaint;
MarkerClusterer.prototype['setCalculator'] =
    MarkerClusterer.prototype.setCalculator;
MarkerClusterer.prototype['setGridSize'] =
    MarkerClusterer.prototype.setGridSize;
MarkerClusterer.prototype['setMaxZoom'] =
    MarkerClusterer.prototype.setMaxZoom;
MarkerClusterer.prototype['onAdd'] = MarkerClusterer.prototype.onAdd;
MarkerClusterer.prototype['draw'] = MarkerClusterer.prototype.draw;

Cluster.prototype['getCenter'] = Cluster.prototype.getCenter;
Cluster.prototype['getSize'] = Cluster.prototype.getSize;
Cluster.prototype['getMarkers'] = Cluster.prototype.getMarkers;

ClusterIcon.prototype['onAdd'] = ClusterIcon.prototype.onAdd;
ClusterIcon.prototype['draw'] = ClusterIcon.prototype.draw;
ClusterIcon.prototype['onRemove'] = ClusterIcon.prototype.onRemove;

/**
 * @name InfoBox
 * @version 1.1.8 [August 24, 2011]
 * @author Gary Little (inspired by proof-of-concept code from Pamela Fox of Google)
 * @copyright Copyright 2010 Gary Little [gary at luxcentral.com]
 * @fileoverview InfoBox extends the Google Maps JavaScript API V3 <tt>OverlayView</tt> class.
 *  <p>
 *  An InfoBox behaves like a <tt>google.maps.InfoWindow</tt>, but it supports several
 *  additional properties for advanced styling. An InfoBox can also be used as a map label.
 *  <p>
 *  An InfoBox also fires the same events as a <tt>google.maps.InfoWindow</tt>.
 *  <p>
 *  Browsers tested:
 *  <p>
 *  Mac -- Safari (4.0.4), Firefox (3.6), Opera (10.10), Chrome (4.0.249.43), OmniWeb (5.10.1)
 *  <br>
 *  Win -- Safari, Firefox, Opera, Chrome (3.0.195.38), Internet Explorer (8.0.6001.18702)
 *  <br>
 *  iPod Touch/iPhone -- Safari (3.1.2)
 */

/*!
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*jslint browser:true */
/*global google */

/**
 * @name InfoBoxOptions
 * @class This class represents the optional parameter passed to the {@link InfoBox} constructor.
 * @property {string|Node} content The content of the InfoBox (plain text or an HTML DOM node).
 * @property {boolean} disableAutoPan Disable auto-pan on <tt>open</tt> (default is <tt>false</tt>).
 * @property {number} maxWidth The maximum width (in pixels) of the InfoBox. Set to 0 if no maximum.
 * @property {Size} pixelOffset The offset (in pixels) from the top left corner of the InfoBox
 *  (or the bottom left corner if the <code>alignBottom</code> property is <code>true</code>)
 *  to the map pixel corresponding to <tt>position</tt>.
 * @property {LatLng} position The geographic location at which to display the InfoBox.
 * @property {number} zIndex The CSS z-index style value for the InfoBox.
 *  Note: This value overrides a zIndex setting specified in the <tt>boxStyle</tt> property.
 * @property {string} boxClass The name of the CSS class defining the styles for the InfoBox container.
 *  The default name is <code>infoBox</code>.
 * @property {Object} [boxStyle] An object literal whose properties define specific CSS
 *  style values to be applied to the InfoBox. Style values defined here override those that may
 *  be defined in the <code>boxClass</code> style sheet. If this property is changed after the
 *  InfoBox has been created, all previously set styles (except those defined in the style sheet)
 *  are removed from the InfoBox before the new style values are applied.
 * @property {string} closeBoxMargin The CSS margin style value for the close box.
 *  The default is "2px" (a 2-pixel margin on all sides).
 * @property {string} closeBoxURL The URL of the image representing the close box.
 *  Note: The default is the URL for Google's standard close box.
 *  Set this property to "" if no close box is required.
 * @property {Size} infoBoxClearance Minimum offset (in pixels) from the InfoBox to the
 *  map edge after an auto-pan.
 * @property {boolean} isHidden Hide the InfoBox on <tt>open</tt> (default is <tt>false</tt>).
 * @property {boolean} alignBottom Align the bottom left corner of the InfoBox to the <code>position</code>
 *  location (default is <tt>false</tt> which means that the top left corner of the InfoBox is aligned).
 * @property {string} pane The pane where the InfoBox is to appear (default is "floatPane").
 *  Set the pane to "mapPane" if the InfoBox is being used as a map label.
 *  Valid pane names are the property names for the <tt>google.maps.MapPanes</tt> object.
 * @property {boolean} enableEventPropagation Propagate mousedown, click, dblclick,
 *  and contextmenu events in the InfoBox (default is <tt>false</tt> to mimic the behavior
 *  of a <tt>google.maps.InfoWindow</tt>). Set this property to <tt>true</tt> if the InfoBox
 *  is being used as a map label. iPhone note: This property setting has no effect; events are
 *  always propagated.
 */

/**
 * Creates an InfoBox with the options specified in {@link InfoBoxOptions}.
 *  Call <tt>InfoBox.open</tt> to add the box to the map.
 * @constructor
 * @param {InfoBoxOptions} [opt_opts]
 */
function InfoBox(opt_opts) {

  opt_opts = opt_opts || {};

  google.maps.OverlayView.apply(this, arguments);

  // Standard options (in common with google.maps.InfoWindow):
  //
  this.content_ = opt_opts.content || "";
  this.disableAutoPan_ = opt_opts.disableAutoPan || false;
  this.maxWidth_ = opt_opts.maxWidth || 0;
  this.pixelOffset_ = opt_opts.pixelOffset || new google.maps.Size(0, 0);
  this.position_ = opt_opts.position || new google.maps.LatLng(0, 0);
  this.zIndex_ = opt_opts.zIndex || null;

  // Additional options (unique to InfoBox):
  //
  this.boxClass_ = opt_opts.boxClass || "infoBox";
  this.boxStyle_ = opt_opts.boxStyle || {};
  this.closeBoxMargin_ = opt_opts.closeBoxMargin || "2px";
  this.closeBoxURL_ = opt_opts.closeBoxURL || "http://www.google.com/intl/en_us/mapfiles/close.gif";
  if (opt_opts.closeBoxURL === "") {
    this.closeBoxURL_ = "";
  }
  this.infoBoxClearance_ = opt_opts.infoBoxClearance || new google.maps.Size(1, 1);
  this.isHidden_ = opt_opts.isHidden || false;
  this.alignBottom_ = opt_opts.alignBottom || false;
  this.pane_ = opt_opts.pane || "floatPane";
  this.enableEventPropagation_ = opt_opts.enableEventPropagation || false;

  this.div_ = null;
  this.closeListener_ = null;
  this.eventListener1_ = null;
  this.eventListener2_ = null;
  this.eventListener3_ = null;
  this.moveListener_ = null;
  this.contextListener_ = null;
  this.fixedWidthSet_ = null;
}

/* InfoBox extends OverlayView in the Google Maps API v3.
 */
InfoBox.prototype = new google.maps.OverlayView();

/**
 * Creates the DIV representing the InfoBox.
 * @private
 */
InfoBox.prototype.createInfoBoxDiv_ = function () {

  var bw;
  var me = this;

  // This handler prevents an event in the InfoBox from being passed on to the map.
  //
  var cancelHandler = function (e) {
    e.cancelBubble = true;

    if (e.stopPropagation) {

      e.stopPropagation();
    }
  };

  // This handler ignores the current event in the InfoBox and conditionally prevents
  // the event from being passed on to the map. It is used for the contextmenu event.
  //
  var ignoreHandler = function (e) {

    e.returnValue = false;

    if (e.preventDefault) {

      e.preventDefault();
    }

    if (!me.enableEventPropagation_) {

      cancelHandler(e);
    }
  };

  if (!this.div_) {

    this.div_ = document.createElement("div");

    this.setBoxStyle_();

    if (typeof this.content_.nodeType === "undefined") {
      this.div_.innerHTML = this.getCloseBoxImg_() + this.content_;
    } else {
      this.div_.innerHTML = this.getCloseBoxImg_();
      this.div_.appendChild(this.content_);
    }

    // Add the InfoBox DIV to the DOM
    this.getPanes()[this.pane_].appendChild(this.div_);

    this.addClickHandler_();

    if (this.div_.style.width) {

      this.fixedWidthSet_ = true;

    } else {

      if (this.maxWidth_ !== 0 && this.div_.offsetWidth > this.maxWidth_) {

        this.div_.style.width = this.maxWidth_;
        this.div_.style.overflow = "auto";
        this.fixedWidthSet_ = true;

      } else { // The following code is needed to overcome problems with MSIE

        bw = this.getBoxWidths_();

        this.div_.style.width = (this.div_.offsetWidth - bw.left - bw.right) + "px";
        this.fixedWidthSet_ = false;
      }
    }

    this.panBox_(this.disableAutoPan_);

    if (!this.enableEventPropagation_) {

      // Cancel event propagation.
      //
      this.eventListener1_ = google.maps.event.addDomListener(this.div_, "mousedown", cancelHandler);
      this.eventListener2_ = google.maps.event.addDomListener(this.div_, "click", cancelHandler);
      this.eventListener3_ = google.maps.event.addDomListener(this.div_, "dblclick", cancelHandler);
      this.eventListener4_ = google.maps.event.addDomListener(this.div_, "mouseover", function (e) {
        this.style.cursor = "default";
      });
    }

    this.contextListener_ = google.maps.event.addDomListener(this.div_, "contextmenu", ignoreHandler);

    /**
     * This event is fired when the DIV containing the InfoBox's content is attached to the DOM.
     * @name InfoBox#domready
     * @event
     */
    google.maps.event.trigger(this, "domready");
  }
};

/**
 * Returns the HTML <IMG> tag for the close box.
 * @private
 */
InfoBox.prototype.getCloseBoxImg_ = function () {

  var img = "";

  if (this.closeBoxURL_ !== "") {

    img  = "<img";
    img += " src='" + this.closeBoxURL_ + "'";
    img += " align=right"; // Do this because Opera chokes on style='float: right;'
    img += " style='";
    img += " position: relative;"; // Required by MSIE
    img += " cursor: pointer;";
    img += " margin: " + this.closeBoxMargin_ + ";";
    img += "'>";
  }

  return img;
};

/**
 * Adds the click handler to the InfoBox close box.
 * @private
 */
InfoBox.prototype.addClickHandler_ = function () {

  var closeBox;

  if (this.closeBoxURL_ !== "") {

    closeBox = this.div_.firstChild;
    this.closeListener_ = google.maps.event.addDomListener(closeBox, 'click', this.getCloseClickHandler_());

  } else {

    this.closeListener_ = null;
  }
};

/**
 * Returns the function to call when the user clicks the close box of an InfoBox.
 * @private
 */
InfoBox.prototype.getCloseClickHandler_ = function () {

  var me = this;

  return function (e) {

    // 1.0.3 fix: Always prevent propagation of a close box click to the map:
    e.cancelBubble = true;

    if (e.stopPropagation) {

      e.stopPropagation();
    }

    me.close();

    /**
     * This event is fired when the InfoBox's close box is clicked.
     * @name InfoBox#closeclick
     * @event
     */
    google.maps.event.trigger(me, "closeclick");
  };
};

/**
 * Pans the map so that the InfoBox appears entirely within the map's visible area.
 * @private
 */
InfoBox.prototype.panBox_ = function (disablePan) {

  var map;
  var bounds;
  var xOffset = 0, yOffset = 0;

  if (!disablePan) {

    map = this.getMap();

    if (map instanceof google.maps.Map) { // Only pan if attached to map, not panorama

      if (!map.getBounds().contains(this.position_)) {
      // Marker not in visible area of map, so set center
      // of map to the marker position first.
        map.setCenter(this.position_);
      }

      bounds = map.getBounds();

      var mapDiv = map.getDiv();
      var mapWidth = mapDiv.offsetWidth;
      var mapHeight = mapDiv.offsetHeight;
      var iwOffsetX = this.pixelOffset_.width;
      var iwOffsetY = this.pixelOffset_.height;
      var iwWidth = this.div_.offsetWidth;
      var iwHeight = this.div_.offsetHeight;
      var padX = this.infoBoxClearance_.width;
      var padY = this.infoBoxClearance_.height;
      var pixPosition = this.getProjection().fromLatLngToContainerPixel(this.position_);

      if (pixPosition.x < (-iwOffsetX + padX)) {
        xOffset = pixPosition.x + iwOffsetX - padX;
      } else if ((pixPosition.x + iwWidth + iwOffsetX + padX) > mapWidth) {
        xOffset = pixPosition.x + iwWidth + iwOffsetX + padX - mapWidth;
      }
      if (this.alignBottom_) {
        if (pixPosition.y < (-iwOffsetY + padY + iwHeight)) {
          yOffset = pixPosition.y + iwOffsetY - padY - iwHeight;
        } else if ((pixPosition.y + iwOffsetY + padY) > mapHeight) {
          yOffset = pixPosition.y + iwOffsetY + padY - mapHeight;
        }
      } else {
        if (pixPosition.y < (-iwOffsetY + padY)) {
          yOffset = pixPosition.y + iwOffsetY - padY;
        } else if ((pixPosition.y + iwHeight + iwOffsetY + padY) > mapHeight) {
          yOffset = pixPosition.y + iwHeight + iwOffsetY + padY - mapHeight;
        }
      }

      if (!(xOffset === 0 && yOffset === 0)) {

        // Move the map to the shifted center.
        //
        var c = map.getCenter();
        map.panBy(xOffset, yOffset);
      }
    }
  }
};

/**
 * Sets the style of the InfoBox by setting the style sheet and applying
 * other specific styles requested.
 * @private
 */
InfoBox.prototype.setBoxStyle_ = function () {

  var i, boxStyle;

  if (this.div_) {

    // Apply style values from the style sheet defined in the boxClass parameter:
    this.div_.className = this.boxClass_;

    // Clear existing inline style values:
    this.div_.style.cssText = "";

    // Apply style values defined in the boxStyle parameter:
    boxStyle = this.boxStyle_;
    for (i in boxStyle) {

      if (boxStyle.hasOwnProperty(i)) {

        this.div_.style[i] = boxStyle[i];
      }
    }

    // Fix up opacity style for benefit of MSIE:
    //
    if (typeof this.div_.style.opacity !== "undefined" && this.div_.style.opacity !== "") {

      this.div_.style.filter = "alpha(opacity=" + (this.div_.style.opacity * 100) + ")";
    }

    // Apply required styles:
    //
    this.div_.style.position = "absolute";
    this.div_.style.visibility = 'hidden';
    if (this.zIndex_ !== null) {

      this.div_.style.zIndex = this.zIndex_;
    }
  }
};

/**
 * Get the widths of the borders of the InfoBox.
 * @private
 * @return {Object} widths object (top, bottom left, right)
 */
InfoBox.prototype.getBoxWidths_ = function () {

  var computedStyle;
  var bw = {top: 0, bottom: 0, left: 0, right: 0};
  var box = this.div_;

  if (document.defaultView && document.defaultView.getComputedStyle) {

    computedStyle = box.ownerDocument.defaultView.getComputedStyle(box, "");

    if (computedStyle) {

      // The computed styles are always in pixel units (good!)
      bw.top = parseInt(computedStyle.borderTopWidth, 10) || 0;
      bw.bottom = parseInt(computedStyle.borderBottomWidth, 10) || 0;
      bw.left = parseInt(computedStyle.borderLeftWidth, 10) || 0;
      bw.right = parseInt(computedStyle.borderRightWidth, 10) || 0;
    }

  } else if (document.documentElement.currentStyle) { // MSIE

    if (box.currentStyle) {

      // The current styles may not be in pixel units, but assume they are (bad!)
      bw.top = parseInt(box.currentStyle.borderTopWidth, 10) || 0;
      bw.bottom = parseInt(box.currentStyle.borderBottomWidth, 10) || 0;
      bw.left = parseInt(box.currentStyle.borderLeftWidth, 10) || 0;
      bw.right = parseInt(box.currentStyle.borderRightWidth, 10) || 0;
    }
  }

  return bw;
};

/**
 * Invoked when <tt>close</tt> is called. Do not call it directly.
 */
InfoBox.prototype.onRemove = function () {

  if (this.div_) {

    this.div_.parentNode.removeChild(this.div_);
    this.div_ = null;
  }
};

/**
 * Draws the InfoBox based on the current map projection and zoom level.
 */
InfoBox.prototype.draw = function () {

  this.createInfoBoxDiv_();

  var pixPosition = this.getProjection().fromLatLngToDivPixel(this.position_);

  this.div_.style.left = (pixPosition.x + this.pixelOffset_.width) + "px";

  if (this.alignBottom_) {
    this.div_.style.bottom = -(pixPosition.y + this.pixelOffset_.height) + "px";
  } else {
    this.div_.style.top = (pixPosition.y + this.pixelOffset_.height) + "px";
  }

  if (this.isHidden_) {

    this.div_.style.visibility = 'hidden';

  } else {

    this.div_.style.visibility = "visible";
  }
};

/**
 * Sets the options for the InfoBox. Note that changes to the <tt>maxWidth</tt>,
 *  <tt>closeBoxMargin</tt>, <tt>closeBoxURL</tt>, and <tt>enableEventPropagation</tt>
 *  properties have no affect until the current InfoBox is <tt>close</tt>d and a new one
 *  is <tt>open</tt>ed.
 * @param {InfoBoxOptions} opt_opts
 */
InfoBox.prototype.setOptions = function (opt_opts) {
  if (typeof opt_opts.boxClass !== "undefined") { // Must be first

    this.boxClass_ = opt_opts.boxClass;
    this.setBoxStyle_();
  }
  if (typeof opt_opts.boxStyle !== "undefined") { // Must be second

    this.boxStyle_ = opt_opts.boxStyle;
    this.setBoxStyle_();
  }
  if (typeof opt_opts.content !== "undefined") {

    this.setContent(opt_opts.content);
  }
  if (typeof opt_opts.disableAutoPan !== "undefined") {

    this.disableAutoPan_ = opt_opts.disableAutoPan;
  }
  if (typeof opt_opts.maxWidth !== "undefined") {

    this.maxWidth_ = opt_opts.maxWidth;
  }
  if (typeof opt_opts.pixelOffset !== "undefined") {

    this.pixelOffset_ = opt_opts.pixelOffset;
  }
  if (typeof opt_opts.alignBottom !== "undefined") {

    this.alignBottom_ = opt_opts.alignBottom;
  }
  if (typeof opt_opts.position !== "undefined") {

    this.setPosition(opt_opts.position);
  }
  if (typeof opt_opts.zIndex !== "undefined") {

    this.setZIndex(opt_opts.zIndex);
  }
  if (typeof opt_opts.closeBoxMargin !== "undefined") {

    this.closeBoxMargin_ = opt_opts.closeBoxMargin;
  }
  if (typeof opt_opts.closeBoxURL !== "undefined") {

    this.closeBoxURL_ = opt_opts.closeBoxURL;
  }
  if (typeof opt_opts.infoBoxClearance !== "undefined") {

    this.infoBoxClearance_ = opt_opts.infoBoxClearance;
  }
  if (typeof opt_opts.isHidden !== "undefined") {

    this.isHidden_ = opt_opts.isHidden;
  }
  if (typeof opt_opts.enableEventPropagation !== "undefined") {

    this.enableEventPropagation_ = opt_opts.enableEventPropagation;
  }

  if (this.div_) {

    this.draw();
  }
};

/**
 * Sets the content of the InfoBox.
 *  The content can be plain text or an HTML DOM node.
 * @param {string|Node} content
 */
InfoBox.prototype.setContent = function (content) {
  this.content_ = content;

  if (this.div_) {

    if (this.closeListener_) {

      google.maps.event.removeListener(this.closeListener_);
      this.closeListener_ = null;
    }

    // Odd code required to make things work with MSIE.
    //
    if (!this.fixedWidthSet_) {

      this.div_.style.width = "";
    }

    if (typeof content.nodeType === "undefined") {
      this.div_.innerHTML = this.getCloseBoxImg_() + content;
    } else {
      this.div_.innerHTML = this.getCloseBoxImg_();
      this.div_.appendChild(content);
    }

    // Perverse code required to make things work with MSIE.
    // (Ensures the close box does, in fact, float to the right.)
    //
    if (!this.fixedWidthSet_) {
      this.div_.style.width = this.div_.offsetWidth + "px";
      if (typeof content.nodeType === "undefined") {
        this.div_.innerHTML = this.getCloseBoxImg_() + content;
      } else {
        this.div_.innerHTML = this.getCloseBoxImg_();
        // Note: don't append the content node again
      }
    }

    this.addClickHandler_();
  }

  /**
   * This event is fired when the content of the InfoBox changes.
   * @name InfoBox#content_changed
   * @event
   */
  google.maps.event.trigger(this, "content_changed");
};

/**
 * Sets the geographic location of the InfoBox.
 * @param {LatLng} latlng
 */
InfoBox.prototype.setPosition = function (latlng) {

  this.position_ = latlng;

  if (this.div_) {

    this.draw();
  }

  /**
   * This event is fired when the position of the InfoBox changes.
   * @name InfoBox#position_changed
   * @event
   */
  google.maps.event.trigger(this, "position_changed");
};

/**
 * Sets the zIndex style for the InfoBox.
 * @param {number} index
 */
InfoBox.prototype.setZIndex = function (index) {

  this.zIndex_ = index;

  if (this.div_) {

    this.div_.style.zIndex = index;
  }

  /**
   * This event is fired when the zIndex of the InfoBox changes.
   * @name InfoBox#zindex_changed
   * @event
   */
  google.maps.event.trigger(this, "zindex_changed");
};

/**
 * Returns the content of the InfoBox.
 * @returns {string}
 */
InfoBox.prototype.getContent = function () {

  return this.content_;
};

/**
 * Returns the geographic location of the InfoBox.
 * @returns {LatLng}
 */
InfoBox.prototype.getPosition = function () {

  return this.position_;
};

/**
 * Returns the zIndex for the InfoBox.
 * @returns {number}
 */
InfoBox.prototype.getZIndex = function () {

  return this.zIndex_;
};

/**
 * Shows the InfoBox.
 */
InfoBox.prototype.show = function () {

  this.isHidden_ = false;
  if (this.div_) {
    this.div_.style.visibility = "visible";
  }
};

/**
 * Hides the InfoBox.
 */
InfoBox.prototype.hide = function () {

  this.isHidden_ = true;
  if (this.div_) {
    this.div_.style.visibility = "hidden";
  }
};

/**
 * Adds the InfoBox to the specified map or Street View panorama. If <tt>anchor</tt>
 *  (usually a <tt>google.maps.Marker</tt>) is specified, the position
 *  of the InfoBox is set to the position of the <tt>anchor</tt>. If the
 *  anchor is dragged to a new location, the InfoBox moves as well.
 * @param {Map|StreetViewPanorama} map
 * @param {MVCObject} [anchor]
 */
InfoBox.prototype.open = function (map, anchor) {

  var me = this;

  if (anchor) {

    this.position_ = anchor.getPosition();
    this.moveListener_ = google.maps.event.addListener(anchor, "position_changed", function () {
      me.setPosition(this.getPosition());
    });
  }

  this.setMap(map);

  if (this.div_) {

    this.panBox_();
  }
};

/**
 * Removes the InfoBox from the map.
 */
InfoBox.prototype.close = function () {

  if (this.closeListener_) {

    google.maps.event.removeListener(this.closeListener_);
    this.closeListener_ = null;
  }

  if (this.eventListener1_) {

    google.maps.event.removeListener(this.eventListener1_);
    google.maps.event.removeListener(this.eventListener2_);
    google.maps.event.removeListener(this.eventListener3_);
    google.maps.event.removeListener(this.eventListener4_);
    this.eventListener1_ = null;
    this.eventListener2_ = null;
    this.eventListener3_ = null;
    this.eventListener4_ = null;
  }

  if (this.moveListener_) {

    google.maps.event.removeListener(this.moveListener_);
    this.moveListener_ = null;
  }

  if (this.contextListener_) {

    google.maps.event.removeListener(this.contextListener_);
    this.contextListener_ = null;
  }

  this.setMap(null);
};

/**
 * jquery.numberformatter - Formatting/Parsing Numbers in jQuery
 * Written by Michael Abernethy (mike@abernethysoft.com)
 *
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * Date: 1/26/08
 *
 * @author Michael Abernethy
 * @version 1.1.0
 *
 *
 * This plugin can be used to format numbers as text and parse text as Numbers
 * Because we live in an international world, we cannot assume that everyone
 * uses "," to divide thousands, and "." as a decimal point.
 *
 * The format() function will take the text within any selector by calling
 * text() or val() on them, getting the String, and applying the specified format to it.
 * It will return the jQuery object
 *
 * The parse() function will take the text within any selector by calling text()
 * or val() on them, turning the String into a Number, and returning these
 * values in a Number array.
 * It WILL BREAK the jQuery chain, and return an Array of Numbers.
 *
 * The syntax for the formatting is:
 * 0 = Digit
 * # = Digit, zero shows as absent
 * . = Decimal separator
 * - = Negative sign
 * , = Grouping Separator
 * % = Percent (multiplies the number by 100)
 * For example, a format of "#,###.00" and text of 4500.20 will
 * display as "4.500,20" with a locale of "de", and "4,500.20" with a locale of "us"
 *
 *
 * As of now, the only acceptable locales are
 * United States -> "us"
 * Arab Emirates -> "ae"
 * Egypt -> "eg"
 * Israel -> "il"
 * Japan -> "jp"
 * South Korea -> "kr"
 * Thailand -> "th"
 * China -> "cn"
 * Hong Kong -> "hk"
 * Taiwan -> "tw"
 * Australia -> "au"
 * Canada -> "ca"
 * Great Britain -> "gb"
 * India -> "in"
 * Germany -> "de"
 * Vietnam -> "vn"
 * Spain -> "es"
 * Denmark -> "dk"
 * Austria -> "at"
 * Greece -> "gr"
 * Brazil -> "br"
 * Czech -> "cz"
 * France  -> "fr"
 * Finland -> "fi"
 * Russia -> "ru"
 * Sweden -> "se"
 * Switzerland -> "ch"
 *
 * TODO
 * Separate positive and negative patterns separated by a ":" (e.g. use (#,###) for accounting)
 * More options may come in the future (currency)
 **/

 (function(jQuery) {

     function FormatData(dec, group, neg) {
       this.dec = dec;
       this.group = group;
       this.neg = neg;
     };

     function formatCodes(locale) {

         // default values
         var dec = ".";
         var group = ",";
         var neg = "-";

         if (locale == "us" ||
             locale == "ae" ||
             locale == "eg" ||
             locale == "il" ||
             locale == "jp" ||
             locale == "sk" ||
             locale == "th" ||
             locale == "cn" ||
             locale == "hk" ||
             locale == "tw" ||
             locale == "au" ||
             locale == "ca" ||
             locale == "gb" ||
             locale == "in"
            )
         {
              dec = ".";
              group = ",";
         }

         else if (locale == "de" ||
             locale == "vn" ||
             locale == "es" ||
             locale == "dk" ||
             locale == "at" ||
             locale == "gr" ||
             locale == "br"
            )
         {
              dec = ",";
              group = ".";
         }
         else if (locale == "cz" ||
              locale == "fr" ||
             locale == "fi" ||
             locale == "ru" ||
             locale == "se"
            )
         {
              group = " ";
              dec = ",";
         }
         else if (locale == "ch")
          {
              group = "'";
              dec = ".";
          }

        return new FormatData(dec, group, neg);

    };

 jQuery.formatNumber = function(number, options) {
     var options = jQuery.extend({},jQuery.fn.parse.defaults, options);
     var formatData = formatCodes(options.locale.toLowerCase());

     var dec = formatData.dec;
     var group = formatData.group;
     var neg = formatData.neg;

     var numString = new String(number);
     numString = numString.replace(".",dec).replace("-",neg);
     return numString;
 };

 jQuery.fn.parse = function(options) {

     var options = jQuery.extend({},jQuery.fn.parse.defaults, options);

     var formatData = formatCodes(options.locale.toLowerCase());

     var dec = formatData.dec;
     var group = formatData.group;
     var neg = formatData.neg;

     var valid = "1234567890.-";

     var array = [];
     this.each(function(){

         var text = new String(jQuery(this).text());
         if (jQuery(this).is(":input"))
            text = new String(jQuery(this).val());

         // now we need to convert it into a number
         text = text.replace(group,'').replace(dec,".").replace(neg,"-");
         var validText = "";
         var hasPercent = false;
         if (text.charAt(text.length-1)=="%")
             hasPercent = true;
         for (var i=0; i<text.length; i++)
         {
            if (valid.indexOf(text.charAt(i))>-1)
               validText = validText + text.charAt(i);
         }
         var number = new Number(validText);
         if (hasPercent)
         {
            number = number / 100;
            number = number.toFixed(validText.length-1);
         }
         array.push(number);
     });

     return array;
 };

 jQuery.fn.format = function(options) {

     var options = jQuery.extend({},jQuery.fn.format.defaults, options);

     var formatData = formatCodes(options.locale.toLowerCase());

     var dec = formatData.dec;
     var group = formatData.group;
     var neg = formatData.neg;

     var validFormat = "0#-,.";

     return this.each(function(){
         var text = new String(jQuery(this).text());
         if (jQuery(this).is(":input"))
            text = new String(jQuery(this).val());

         // strip all the invalid characters at the beginning and the end
         // of the format, and we'll stick them back on at the end
         // make a special case for the negative sign "-" though, so
         // we can have formats like -$23.32
         var prefix = "";
         var negativeInFront = false;
         for (var i=0; i<options.format.length; i++)
         {
            if (validFormat.indexOf(options.format.charAt(i))==-1)
                prefix = prefix + options.format.charAt(i);
            else if (i==0 && options.format.charAt(i)=='-')
            {
               negativeInFront = true;
               continue;
            }
            else
                break;
         }
         var suffix = "";
         for (var i=options.format.length-1; i>=0; i--)
         {
            if (validFormat.indexOf(options.format.charAt(i))==-1)
                suffix = options.format.charAt(i) + suffix;
            else
                break;
         }

         options.format = options.format.substring(prefix.length);
         options.format = options.format.substring(0, options.format.length - suffix.length);


        // now we need to convert it into a number
        var number = new Number(text.replace(group,'').replace(dec,".").replace(neg,"-"));

        // special case for percentages
        if (suffix == "%")
           number = number * 100;

        var returnString = "";

        var decimalValue = number % 1;
        if (options.format.indexOf(".") > -1)
        {
           var decimalPortion = dec;
           var decimalFormat = options.format.substring(options.format.lastIndexOf(".")+1);
           var decimalString = new String(decimalValue.toFixed(decimalFormat.length));
           decimalString = decimalString.substring(decimalString.lastIndexOf(".")+1);
           for (var i=0; i<decimalFormat.length; i++)
           {
              if (decimalFormat.charAt(i) == '#' && decimalString.charAt(i) != '0')
              {
                 decimalPortion += decimalString.charAt(i);
                 break;
              }
              else if (decimalFormat.charAt(i) == "0")
              {
                 decimalPortion += decimalString.charAt(i);
              }
           }
           returnString += decimalPortion
        }
        else
           number = Math.round(number);

        var ones = Math.floor(number);
        if (number < 0)
            ones = Math.ceil(number);

        var onePortion = "";
        if (ones == 0)
        {
           onePortion = "0";
        }
        else
        {
           // find how many digits are in the group
           var onesFormat = "";
           if (options.format.indexOf(".") == -1)
              onesFormat = options.format;
           else
              onesFormat = options.format.substring(0, options.format.indexOf("."));
           var oneText = new String(ones);
           var groupLength = 9999;
           if (onesFormat.lastIndexOf(",") != -1)
               groupLength = onesFormat.length - onesFormat.lastIndexOf(",")-1;
           var groupCount = 0;
           for (var i=oneText.length-1; i>-1; i--)
           {
             onePortion = oneText.charAt(i) + onePortion;

             groupCount++;

             if (groupCount == groupLength && i!=0)
             {
                 onePortion = group + onePortion;
                 groupCount = 0;
             }

           }
        }

        returnString = onePortion + returnString;

        // handle special case where negative is in front of the invalid
        // characters
        if (number < 0 && negativeInFront && prefix.length > 0)
        {
           returnString = returnString.substring(1);
           prefix = neg + prefix;
        }

        returnString = prefix + returnString + suffix;

        if (jQuery(this).is(":input"))
           jQuery(this).val(returnString);
        else
           jQuery(this).text(returnString);

     });
 };

 jQuery.fn.parse.defaults = {
      locale: "us"
 };

 jQuery.fn.format.defaults = {
      format: "#,###.00",
      locale: "us"
 };


 })(jQuery);

 /*****************************************************************************
jQuery Placeholder 1.1.9

Copyright (c) 2010 Michael J. Ryan (http://tracker1.info/)

Dual licensed under the MIT and GPL licenses:
	http://www.opensource.org/licenses/mit-license.php
	http://www.gnu.org/licenses/gpl.html

------------------------------------------------------------------------------

Sets up a watermark for inputted fields... this will create a LABEL.watermark
tag immediately following the input tag, the positioning will be set absolute,
and it will be positioned to match the input tag.

To activate:

	$('input[placeholder],textarea[placeholder]').placeholder();


NOTE, when changing a value via script:

	$('#input_id').val('new value').change(); //force change event, so placeholder sets properly


To style the tags as appropriate (you'll want to make sure the font matches):

	label.placeholder {
		cursor: text;				<--- display a cursor to match the text input

		padding: 4px 4px 4px 4px;   <--- this should match the border+padding
											for the input field(s)
		color: #999999;				<--- this will display as faded
	}

You'll also want to have the color set for browsers with native support
	input:placeholder, textarea:placeholder {
		color: #999999;
	}
	input::-webkit-input-placeholder, textarea::-webkit-input-placeholder {
		color: #999999;
	}

------------------------------------------------------------------------------

Thanks to...
	http://www.alistapart.com/articles/makingcompactformsmoreaccessible
	http://plugins.jquery.com/project/overlabel

	This works similar to the overlabel, but creates the actual label tag
	based on the placeholder attribute on the input tag, instead of
	relying on the markup to provide it.

*****************************************************************************/
(function($){

	var ph = "PLACEHOLDERINPUT";
	var phl = "PLACEHOLDERLABEL";
	var boundEvents = false;
	var default_options = {
		labelClass: 'placeholder'
	};

	//check for native support for placeholder attribute, if so stub methods and return
	var input = document.createElement("input");
	if ('placeholder' in input) {
		$.fn.placeholder = $.fn.unplaceholder = function(){}; //empty function
		delete input; //cleanup IE memory
		return;
	};
	delete input;

	//bind to resize to fix placeholders when the page resizes (fields are hidden/displayed, which can change positioning).
	$(window).resize(checkResize);


	$.fn.placeholder = function(options) {
		bindEvents();

		var opts = $.extend(default_options, options)

		this.each(function(){
			var rnd=Math.random().toString(32).replace(/\./,'')
				,input=$(this)
				,label=$('<label style="position:absolute;display:none;top:0;left:0;"></label>');

			if (!input.attr('placeholder') || input.data(ph) === ph) return; //already watermarked

			//make sure the input tag has an ID assigned, if not, assign one.
			if (!input.attr('id')) input.attr('id', 'input_' + rnd);

			label	.attr('id',input.attr('id') + "_placeholder")
					.data(ph, '#' + input.attr('id'))	//reference to the input tag
					.attr('for',input.attr('id'))
					.addClass(opts.labelClass)
					.addClass(opts.labelClass + '-for-' + this.tagName.toLowerCase()) //ex: watermark-for-textarea
					.addClass(phl)
					.text(input.attr('placeholder'));

			input
				.data(phl, '#' + label.attr('id'))	//set a reference to the label
				.data(ph,ph)		//set that the field is watermarked
				.addClass(ph)		//add the watermark class
				.after(label)		//add the label field to the page

			//setup overlay
			itemFocus.call(this);
			itemBlur.call(this);
		});
	};

	$.fn.unplaceholder = function(){
		this.each(function(){
			var	input=$(this),
				label=$(input.data(phl));

			if (input.data(ph) !== ph) return;

			label.remove();
			input.removeData(ph).removeData(phl).removeClass(ph).unbind('change',itemChange);
		});
	};

	function bindEvents() {
		if (boundEvents) return;

		//prepare live bindings if not already done.
		$("form").live('reset', function(){
			$(this).find('.' + ph).each(itemBlur);
		});
		$('.' + ph)
			.live('keydown',itemFocus)
			.live('mousedown',itemFocus)
			.live('mouseup',itemFocus)
			.live('mouseclick',itemFocus)
			.live('focus',itemFocus)
			.live('focusin',itemFocus)
			.live('blur',itemBlur)
			.live('focusout',itemBlur)
			.live('change',itemChange);
			;
		$('.' + phl)
			.live('click', function() {  $($(this).data(ph)).focus(); })
			.live('mouseup', function() {  $($(this).data(ph)).focus(); });
		bound = true;

		boundEvents = true;
	};

	function itemChange() {
		var input = $(this);
		if (!!input.val()) {
			$(input.data(phl)).hide();
			return;
		}
		if (input.data(ph+'FOCUSED') != 1) {
			showPHL(input);
		}
	}

	function itemFocus() {
		$($(this).data(ph+'FOCUSED',1).data(phl)).hide();
	};

	function itemBlur() {
		var that = this;
		showPHL($(this).removeData(ph+'FOCUSED'));

		//use timeout to let other validators/formatters directly bound to blur/focusout work
		setTimeout(function(){
			var input = $(that);

			//if the item wasn't refocused, test the item
			if (input.data(ph+'FOCUSED') != 1) {
				showPHL(input);
			}
		}, 200);
	};

	function showPHL(input, forced) {
		var label = $(input.data(phl));

		//if not already shown, and needs to be, show it.
		if ((forced || label.css('display') == 'none') && !input.val())
			label
				.text(input.attr('placeholder'))
				.css('top', input.position().top + 'px')
				.css('left', input.position().left + 'px')
				.css('display', 'block');

		//console.dir({ 'input': { 'id':input.attr('id'), 'pos': input.position() }});
	}

	var cr;
	function checkResize() {
		if (cr) window.clearTimeout(cr);
		cr = window.setTimeout(checkResize2, 50);
	}
	function checkResize2() {
		$('.' + ph).each(function(){
			var input = $(this);
			var focused = $(this).data(ph+'FOCUSED');
			if (!focused) showPHL(input, true);
		});
	}

}(jQuery));

/**
sprintf() for JavaScript 0.7-beta1
http://www.diveintojavascript.com/projects/javascript-sprintf

Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of sprintf() for JavaScript nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL Alexandru Marasteanu BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


Changelog:
2010.09.06 - 0.7-beta1
  - features: vsprintf, support for named placeholders
  - enhancements: format cache, reduced global namespace pollution

2010.05.22 - 0.6:
 - reverted to 0.4 and fixed the bug regarding the sign of the number 0
 Note:
 Thanks to Raphael Pigulla <raph (at] n3rd [dot) org> (http://www.n3rd.org/)
 who warned me about a bug in 0.5, I discovered that the last update was
 a regress. I appologize for that.

2010.05.09 - 0.5:
 - bug fix: 0 is now preceeded with a + sign
 - bug fix: the sign was not at the right position on padded results (Kamal Abdali)
 - switched from GPL to BSD license

2007.10.21 - 0.4:
 - unit test and patch (David Baird)

2007.09.17 - 0.3:
 - bug fix: no longer throws exception on empty paramenters (Hans Pufal)

2007.09.11 - 0.2:
 - feature: added argument swapping

2007.04.03 - 0.1:
 - initial release
**/

var sprintf = (function() {
	function get_type(variable) {
		return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
	}
	function str_repeat(input, multiplier) {
		for (var output = []; multiplier > 0; output[--multiplier] = input) {/* do nothing */}
		return output.join('');
	}

	var str_format = function() {
		if (!str_format.cache.hasOwnProperty(arguments[0])) {
			str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
		}
		return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
	};

	str_format.format = function(parse_tree, argv) {
		var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
		for (i = 0; i < tree_length; i++) {
			node_type = get_type(parse_tree[i]);
			if (node_type === 'string') {
				output.push(parse_tree[i]);
			}
			else if (node_type === 'array') {
				match = parse_tree[i]; // convenience purposes only
				if (match[2]) { // keyword argument
					arg = argv[cursor];
					for (k = 0; k < match[2].length; k++) {
						if (!arg.hasOwnProperty(match[2][k])) {
							throw(sprintf('[sprintf] property "%s" does not exist', match[2][k]));
						}
						arg = arg[match[2][k]];
					}
				}
				else if (match[1]) { // positional argument (explicit)
					arg = argv[match[1]];
				}
				else { // positional argument (implicit)
					arg = argv[cursor++];
				}

				if (/[^s]/.test(match[8]) && (get_type(arg) != 'number')) {
					throw(sprintf('[sprintf] expecting number but found %s', get_type(arg)));
				}
				switch (match[8]) {
					case 'b': arg = arg.toString(2); break;
					case 'c': arg = String.fromCharCode(arg); break;
					case 'd': arg = parseInt(arg, 10); break;
					case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
					case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
					case 'o': arg = arg.toString(8); break;
					case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
					case 'u': arg = Math.abs(arg); break;
					case 'x': arg = arg.toString(16); break;
					case 'X': arg = arg.toString(16).toUpperCase(); break;
				}
				arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
				pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
				pad_length = match[6] - String(arg).length;
				pad = match[6] ? str_repeat(pad_character, pad_length) : '';
				output.push(match[5] ? arg + pad : pad + arg);
			}
		}
		return output.join('');
	};

	str_format.cache = {};

	str_format.parse = function(fmt) {
		var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
		while (_fmt) {
			if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
				parse_tree.push(match[0]);
			}
			else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
				parse_tree.push('%');
			}
			else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
				if (match[2]) {
					arg_names |= 1;
					var field_list = [], replacement_field = match[2], field_match = [];
					if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
						field_list.push(field_match[1]);
						while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
							if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else {
								throw('[sprintf] huh?');
							}
						}
					}
					else {
						throw('[sprintf] huh?');
					}
					match[2] = field_list;
				}
				else {
					arg_names |= 2;
				}
				if (arg_names === 3) {
					throw('[sprintf] mixing positional and named placeholders is not (yet) supported');
				}
				parse_tree.push(match);
			}
			else {
				throw('[sprintf] huh?');
			}
			_fmt = _fmt.substring(match[0].length);
		}
		return parse_tree;
	};

	return str_format;
})();

var vsprintf = function(fmt, argv) {
	argv.unshift(fmt);
	return sprintf.apply(null, argv);
};
