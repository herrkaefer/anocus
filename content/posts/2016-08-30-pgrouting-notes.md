---
title: "pgRouting Notes"
date: "2016-08-30T00:00:00"
summary: "As a novice of GIS and PostGIS, I worked out a way to install a PostgreSQL database with necessary extensions, and loaded some map data by specific tools, and now pgRouting can be performed without problem. But what if I forget all these steps?"
tags: ['pgRouting', 'PostGIS', 'blog']
categories: ["GIS"]
lastmod: 2019-05-04
comments: true
draft: false
---

## Install PostGIS and pgRouting

### On Mac

The following will install `pgRouting` and its dependencies including `PostGIS`, and `PostgreSQL` if not installed:

```sh
brew install pgrouting
```

### On Linux

(to add)

## Install osm2pgrouting

[osm2pgrouting](https://github.com/pgRouting/osm2pgrouting) is for importing OSM data into PostgreSQL database, and creating routable topology.

It is said that osm2pgrouting has limitation:

&gt; Can't process "large" files, continents, big countries, or very large states.

For large files, we can use [osm2po](http://osm2po.de/).

### Install via homebrew (Mac)

```sh
brew install osm2pgrouting
```

Note that a mapconfig.xml file is at: `/usr/local/Cellar/osm2pgrouting/[version]/share/osm2pgrouting/mapconfig.xml`

### Manually install the lastest version

(The following notes are based on version 2.1. Now with homebrew you can already install the latest version.)

1. Download code from [repo](https://github.com/pgRouting/osm2pgrouting)

2. Modify `CMakeLists.txt` to install app to `/usr/local/bin` and other files to `/usr/local/share`
   - line 5 —&gt; set (SHARE_DIR "/usr/local/share/osm2pgrouting")
   - line 36 —&gt; RUNTIME DESTINATION "/usr/local/bin"

3. Add the following headers to `src/way.h` (otherwise there will be errors)

```c++
#include 
#include 
#include 
```

4. Build and install

```sh
cmake -H. -Bbuild
cd build/
make
make install
```

## Workflow

### Prepare database

Create new database if needed:

```sh
createdb routing
```

For each database that postgis and pgrouting are used, we should install corresponding extensions:

```sh
psql routing -c "create extension postgis"
psql routing -c "create extension pgrouting"
```

For test of installation:

```sh
psql routing -c "SELECT postgis_full_version()"
psql routing -c "SELECT pgr_version()"
```

### Import OpenStreetMap data

OSM map data can be downloaded in [many places](https://learnosm.org/en/osm-data/getting-data/). We are interested in the **OSM XML** format.

To import map data to database:

```sh
osm2pgrouting --file beijing_china.osm \
--conf /usr/local/Cellar/osm2pgrouting/[version]/share/osm2pgrouting/mapconfig.xml \
--dbname routing \
--username [username] \
--clean
```

If you are adding data, do not use flag `--clean`.

We could browse the tables with `psql` or `pgAdmin`.

```sh
psql mydb -c "\dt"
```

#### Notes for tables

Two main tables:

- `ways`: stores the edges
- `ways_vertices_pgr`: stores the end nodes of edges

Meanings of `ways` columns `length`, `length_m`, `cost`, `reverse_cost`, `cost_s`, `reverse_cost_s`. According to post [here](https://gis.stackexchange.com/questions/198200/how-are-cost-and-reverse-cost-computed-in-pgrouting/201451#201451):

- `length` is length of the segment in degree units
- `cost` and `reverse_cost` is the length in degree units. (include the negative values for wrong way)
- `length_m` is in meters (there is no cost_m or reverse_cost_m)
- `cost_s` and `reverse_cost_s` is in time: seconds units (using the maxspeed value that is in km/hr transforming it to meters/second and using the `length_m`)

### Do routings in SQL

Now we can calculate routes with `pgRouting`. For example, to calculate one-to-one shortest path:

```sql
SELECT * FROM pgr_dijkstra(
'SELECT gid as id, source, target, cost, reverse_cost FROM ways',
100, 200,
TRUE
);
```

[pgRouting Manuals](http://docs.pgrouting.org/)

### Do routings in Python

I bet that You don't want to write SQLs. Good news here if you like writing Python! I wrote a [`psycopgr`](https://github.com/herrkaefer/psycopgr) Python module to encapsulate database connection (via `psycopg2`) and `pgRouting` callings. Here is a [tutorial](/2016/09/01/psycopgr-tutorial/).